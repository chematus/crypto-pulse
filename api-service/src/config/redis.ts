import { Redis } from 'ioredis';
import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('redis-config');

const REDIS_HOST = env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = env.REDIS_PASSWORD;

logger.info('--- Redis Configuration ---');
logger.info(`Host: ${REDIS_HOST}`);
logger.info(`Port: ${REDIS_PORT}`);
logger.info(`--------------------------`);

const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  logger.info('Successfully connected to Redis server.');
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready to use.');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis client error:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis client connection closed.');
});

redisClient.on('reconnecting', (timeToReconnect: number) => {
  logger.info(`Redis client is reconnecting in ${timeToReconnect}ms...`);
});

/**
 * Closes the Redis connection gracefully.
 * 
 * @returns {Promise<void>}
 */
export const closeRedisConnection = async (): Promise<void> => {
  logger.info('Closing Redis connection...');
  await redisClient.quit();
  logger.info('Redis connection closed.');
};

export default redisClient;
