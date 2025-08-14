import { WebSocketServer, WebSocket } from 'ws';
import pkgKafka from 'kafkajs';
const { Kafka, logLevel: kafkaLogLevel } = pkgKafka;
import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';

import db from './config/db.js';

const logger = loggerUtil('websocket-service');

const PORT = parseInt(env.WEBSOCKET_PORT || '8080', 10);
const KAFKA_BROKER = env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_CLIENT_ID = 'websocket-service';
const KAFKA_GROUP_ID = env.KAFKA_GROUP_ID || 'crypto-websocket-group';
const KAFKA_TOPIC = env.KAFKA_TOPIC || 'crypto-updates';

const isProd = env.NODE_ENV === 'production';
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

logger.info(`--- WebSocket Service Configuration ---`);
logger.info(`Port: ${PORT}`);
logger.info(`Kafka Broker: ${KAFKA_BROKER}`);
logger.info(`------------------------------------`);

const wss = new WebSocketServer({ port: PORT });
logger.info(`WebSocket server started on port ${PORT}`);

function broadcast(data: string) {
  if (wss.clients.size === 0) {
    logger.debug('No clients connected, skipping broadcast.');
    return;
  }
  logger.debug(`Broadcasting data to ${wss.clients.size} clients: ${data}`);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, (err) => {
        if (err) logger.error('Error sending message to a client:', err);
      });
    }
  });
}

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim();
  logger.info(`Client connected: ${clientIp}. Total clients: ${wss.clients.size}`);
  ws.on('close', () => logger.info(`Client disconnected: ${clientIp}. Total: ${wss.clients.size}`));
  ws.on('error', (error) => logger.error(`WebSocket error for client ${clientIp}:`, error));
});

wss.on('error', (error: Error) => {
  logger.error('WebSocket Server critical error:', error);
  process.exit(1);
});

const kafka = new Kafka({
  logLevel: isProd ? kafkaLogLevel.INFO : kafkaLogLevel.DEBUG,
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKER.split(','),
  retry: { initialRetryTime: 300, retries: 5 },
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
  logger.info(`Subscribed to Kafka topic: ${KAFKA_TOPIC}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value || !message.key) {
        logger.warn(`Received message with no value or key`);
        return;
      }
      
      const coinId = message.key.toString();
      const messageValueString = message.value.toString();
      logger.debug(`Received message from Kafka: Key=${coinId}`);

      try {
        const priceData = JSON.parse(messageValueString);
        
        const insertQuery = `
          INSERT INTO price_history(coin_id, price, currency, timestamp)
          VALUES($1, $2, $3, $4)
        `;
        const queryParams = [
          coinId,
          priceData.price,
          priceData.currency,
          new Date(priceData.timestamp),
        ];
        await db.query(insertQuery, queryParams);
        logger.info(`Successfully saved price for ${coinId} to database.`);

        const websocketPayload = JSON.stringify({
          coinId,
          ...priceData,
        });
        broadcast(websocketPayload);

      } catch (error) {
        logger.error(`Failed to process message for coin ${coinId}:`, error);
      }
    },
  });
};

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn(`Received signal: ${signal}. Shutting down gracefully...`);

  try {
    logger.info('Closing WebSocket server...');
    await new Promise<void>((resolve, reject) => {
        wss.close(err => err ? reject(err) : resolve());
        setTimeout(() => {
            logger.warn('WebSocket close timeout. Terminating clients.');
            wss.clients.forEach(client => client.terminate());
            resolve();
        }, 5000);
    });
    logger.info('WebSocket server closed.');

    await consumer.disconnect();
    logger.info('Kafka consumer disconnected.');

    await db.closePool();

    logger.info('Shutdown complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

errorTypes.forEach(type => process.on(type, async () => shutdown(`unhandled_${type}`)));
signalTraps.forEach(type => process.once(type, async () => shutdown(type)));

runConsumer().catch(error => {
  logger.error('Failed to start Kafka consumer:', error);
  process.exit(1);
});
