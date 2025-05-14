import { env } from 'node:process';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid'
import { Kafka, logLevel } from 'kafkajs';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('websocket-service');

const KAFKA_BROKER = env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_CLIENT_ID = 'websocket-service';
const KAFKA_GROUP_ID = uuidv4();
const KAFKA_TOPIC = env.KAFKA_TOPIC || 'crypto-updates';

const WS_PORT = 8080;

const isProd = env.NODE_ENV === 'production';
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

logger.info(`--- Websocket Service Configuration ---`);
logger.info(`Kafka Broker: ${KAFKA_BROKER}`);
logger.info(`Kafka Topic: ${KAFKA_TOPIC}`);
logger.info(`Kafka Group: ${KAFKA_GROUP_ID}`);
logger.info(`Production Mode: ${isProd}`);
logger.info(`---------------------------------`);

const wss = new WebSocketServer({ port: WS_PORT });
logger.info(`Websocket server started on port ${WS_PORT}`);

const broadcast = (data: string) => {
  if (wss.clients.size === 0) {
    logger.info('No clients connected, skipping broadcast');
    
    return;
  }
  
  logger.debug(`Broadcasting data to ${wss.clients.size} clients: ${data}`);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, (error) => {
        if (error) {
          logger.error('Error sending message to a client:', error);
        }
      })
    }
  });
}

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress 
    || (req.headers['x-forwarded-for'] as string).split(',')[0].trim();
  logger.info(`Client connected ${clientIp}. Total clients: ${wss.clients.size}`);

  ws.on('error', (error: Error) => {
    logger.error(`Websocket error for client ${clientIp}:`, error);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    logger.info(`Client disconnected: ${clientIp} (C: ${code}, R: ${reason.toString()}). Total clients: ${wss.clients.size}`);
  });
});

wss.on('error', (error: Error) => {
  logger.error(`Websocket Server critical error:`, error);
  process.exit(1);
})

const kafka = new Kafka({
  logLevel: isProd ? logLevel.INFO : logLevel.DEBUG,
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKER.split(','),
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

const runConsumer = async () => {
  try {
    logger.info('Connecting Kafka consumer...');
    await consumer.connect();
    logger.info('Kafka consumer connected');

    await consumer.subscribe({ topics: [KAFKA_TOPIC], fromBeginning: true });
    logger.info(`Subscribe to Kafka topic: ${KAFKA_TOPIC}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const { key, value } = message;
        if (!key || !value) {
          logger.warn(`Received a message with no key or value from topic ${topic} partition ${partition}`)
          return;
        }

        try {
          const coinId = key.toString(); 
          const coinData = JSON.parse(value.toString());
          const payload = {
            coinId,
            ...coinData,
          }

          broadcast(JSON.stringify(payload));
        } catch (error) {
          logger.error(`Error parsing data for ${key}:${value}`, error);
        }
      }
    })
  } catch (error) {
    logger.error('Error in Kafka consumer operation:', error);
    process.exit(1);
  }
}

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn('Shutdown is already in progress. Ignoring signal.');
    
    return;
  }

  isShuttingDown = true;
  logger.warn(`Received signal: ${signal}. Initiating shutdown...`);

  try {
    logger.info('Closing WebSocket server...');
    await new Promise<void>((res, rej) => {
      wss.close((err) => {
        if (err) {
          logger.error('Error closing WebSocket server:', err);
          
          return rej(err);
        }

        logger.info('WebSocket server closed')
        res();
      });

      setTimeout(() => {
        logger.warn('WebSocket server close timeout. Forcing client disconnections.')

        wss.clients.forEach((client: WebSocket) => {
          client.terminate();
        });

        res();
      }, 5000);
    });

    logger.info('Disconnecting Kafka consumer...');
    await consumer.disconnect()
    logger.info('Kafka consumer disconnected');

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

signalTraps.forEach((type) => {
  process.once(type, async () => await shutdown(type));
});

errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    logger.error(`Unhandled error (${type}):`, error);

    if (!isShuttingDown) {
      await shutdown(`unhandled_${type}`);
    } else {
      process.exit(1);
    }
  });
});

signalTraps.forEach((type) => {
  process.once(type, async () => await shutdown(type));
});

runConsumer().catch((error: Error) => {
  logger.error('Critical error during Kafka consumer startup:', error);
  process.exit(1);
});
