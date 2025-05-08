import { Kafka, logLevel, CompressionTypes, KafkaJSError } from "kafkajs";
import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('data-fetcher');

const KAFKA_BROKER = env.KAFKA_BROKER || 'kafka:9092';
const KAFKA_CLIENT_ID = 'data-fetcher';
const KAFKA_TOPIC = env.KAFKA_TOPIC || 'crypto-updates';
const KAFKA_SEND_RETRIES = parseInt(env.KAFKA_SEND_RETRIES || '3', 10);
const KAFKA_SEND_RETRY_DELAY_MS = parseInt(env.KAFKA_SEND_RETRY_DELAY_MS || '1000', 10);

const API_HOST = env.API_HOST || 'https://api.coingecko.com';
const API_PATH = env.API_PATH || '/api/v3';
const API_ENDPOINT = '/simple/price';
const API_KEY = env.API_KEY || '';
const API_AUTH_HEADER = 'x-cg-demo-api-key';

const DEFAULT_CURRENCY = env.DEFAULT_CURRENCY || 'usd';
const COIN_IDS = env.TRACKED_COIN_IDS || 'bitcoin,ethereum';
const FETCH_INTERVAL_MS = +(env.FETCH_INTERVAL_MS || 30000);

const isProd = env.NODE_ENV === 'production';
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

logger.info(`--- Data Fetcher Configuration ---`);
logger.info(`Kafka Broker: ${KAFKA_BROKER}`);
logger.info(`Kafka Topic: ${KAFKA_TOPIC}`);
logger.info(`Kafka Send Retries: ${KAFKA_SEND_RETRIES}`);
logger.info(`Kafka Send Retry Delay: ${KAFKA_SEND_RETRY_DELAY_MS}ms`);
logger.info(`API Host: ${API_HOST}${API_PATH}`);
logger.info(`Tracked Coins: ${COIN_IDS}`);
logger.info(`Fetch Interval: ${FETCH_INTERVAL_MS}ms`);
logger.info(`Production Mode: ${isProd}`);
logger.info(`---------------------------------`);


const kafka = new Kafka({
  logLevel: isProd ? logLevel.INFO : logLevel.DEBUG,
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKER.split(','),
});

const producer = kafka.producer();

const fetchData = async (): Promise<object | null> => {
  const params = new URLSearchParams({
    vs_currencies: DEFAULT_CURRENCY,
    ids: COIN_IDS,
  });
  const url = `${API_HOST}${API_PATH}${API_ENDPOINT}?${params.toString()}`;
  logger.debug(`Fetching data from: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(API_KEY && { [API_AUTH_HEADER]: API_KEY }),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
      return null;
    }

    const data: object = await response.json();
    logger.debug(`Successfully fetched data: ${JSON.stringify(data)}`);
    return data;

  } catch (error) {
    logger.error('Error during fetch operation:', error);
    return null;
  }
};

type Message = {
  key: string;
  value: string;
};

type PriceData = {
  [currency: string]: number;
}

const createMessage = (key: string, value: number): Message => ({
  key: key,
  value: JSON.stringify({
    price: value,
    currency: DEFAULT_CURRENCY,
    timestamp: new Date().toISOString(),
  }),
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const pushMessages = async (payload: object | null) => {
  if (!payload) {
    logger.warn('No payload received, skipping message push.');
    return;
  }

  const messages: Message[] = Object.entries(payload)
    .map(([coinId, priceData]: [string, PriceData]) => {
        const price = priceData?.[DEFAULT_CURRENCY];
        if (typeof price === 'number') {
            return createMessage(coinId, price);
        } else {
            logger.warn(`Could not find price for currency ${DEFAULT_CURRENCY} in data for ${coinId}`);
            return null;
        }
    })
    .filter((msg): msg is Message => msg !== null);

  if (messages.length === 0) {
    logger.warn('No valid messages created from payload.');
    return;
  }

  let attempts = 0;
  while (attempts < KAFKA_SEND_RETRIES) {
    attempts++;

    try {
      await producer.send({
        topic: KAFKA_TOPIC,
        compression: CompressionTypes.GZIP,
        messages,
      });
      logger.info(`(Attempt ${attempts}) Sent ${messages.length} messages to topic ${KAFKA_TOPIC}. Keys: ${messages.map(m => m.key).join(', ')}`);
      return;
    } catch (error) {
      logger.warn(`(Attempt ${attempts}) Error sending messages to Kafka:`, error);
      const isRetriable = error instanceof KafkaJSError && error.retriable;
      const isPartitionError = error instanceof KafkaJSError && error.message.includes('topic-partition');

      if (isRetriable || isPartitionError) {
        if (attempts < KAFKA_SEND_RETRIES) {
          logger.warn(`Retrying send in ${KAFKA_SEND_RETRY_DELAY_MS}ms...`);
          await delay(KAFKA_SEND_RETRY_DELAY_MS);
        } else {
          logger.error(`Failed to send messages after ${KAFKA_SEND_RETRIES} attempts.`);
        }
      } else {
        logger.error('Non-retriable Kafka error encountered during send. Aborting send.');

        return;
      }
    }
  }
};

const run = async () => {
  logger.info('Connecting Kafka producer...');
  await producer.connect();
  logger.info('Kafka producer connected.');

  const scheduleFetch = () => {
    setTimeout(async () => {
      const data = await fetchData();

      if (data) {
        await pushMessages(data);
      } else {
        logger.warn('Fetch returned null, skipping push.');
      }
     
      scheduleFetch();
    }, FETCH_INTERVAL_MS);
  };

  logger.info(`Starting fetch loop with interval ${FETCH_INTERVAL_MS}ms`);
  scheduleFetch();
};

const shutdown = async (signal: string) => {
  logger.warn(`Received signal: ${signal}. Shutting down...`);

  try {
    logger.info('Disconnecting Kafka producer...');
    await producer.disconnect();
    logger.info('Kafka producer disconnected.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during Kafka producer disconnection:', error);
    process.exit(1);
  }
};

errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    logger.error(`Unhandled error (${type}):`, error);
    await shutdown(`unhandled_${type}`);
  });
});

signalTraps.forEach((type) => {
  process.once(type, async () => await shutdown(type));
});

run().catch((error) => {
  logger.error('Critical error during startup:', error);
  process.exit(1);
});
