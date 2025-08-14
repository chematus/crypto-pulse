import express, { Express, Request, Response, NextFunction } from 'express';
import { env } from 'node:process';
import cors from 'cors';
import loggerUtil from '@root/logger.util.js';

import mainRouter from './routes/index.js';
import { testConnection, closePool } from './config/db.js';
import { closeRedisConnection } from './config/redis.js';

const logger = loggerUtil('api-service');

const SERVER_SHUTDOWN_TIMEOUT = parseInt(env.SERVER_SHUTDOWN_TIMEOUT || '10000', 10);
const PORT = parseInt(env.API_PORT || '5001', 10);
const API_BASE_PATH = env.API_BASE_PATH || '/api/v1';
const FRONTEND_PORT = env.FRONTEND_PORT || '3000';
const FRONTEND_HOST = env.FRONTEND_HOST || 'localhost';

const isProd = env.NODE_ENV === 'production';
const errorTypes = ['unhandledRejection', 'uncaughtException'];
const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

logger.info(`--- API Service Configuration ---`);
logger.info(`Port: ${PORT}`);
logger.info(`API Base Path: ${API_BASE_PATH}`);
logger.info(`Production Mode: ${isProd}`);
logger.info(`--------------------------------`);

const app: Express = express();

app.use(cors({
  origin: `http://${FRONTEND_HOST}:${FRONTEND_PORT}`,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl} (from ${req.ip})`);
  res.on('finish', () => {
    logger.info(`Response sent: ${res.statusCode} for ${req.method} ${req.originalUrl}`);
  });
  next();
});

app.use(API_BASE_PATH, mainRouter);

app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `The requested URL ${req.originalUrl} was not found on this server.`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled application error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const errorResponse = {
    error: 'Internal Server Error',
    message: isProd ? 'An unexpected error occurred on the server.' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  };
  const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json(errorResponse);
});

let server: import('http').Server;

const startServer = async () => {
  try {
    await testConnection();

    server = app.listen(PORT, () => {
      logger.info(`API service listening on port ${PORT}, base path ${API_BASE_PATH}`);
    });
  } catch (error) {
    logger.error('Failed to start API service:', error);
    process.exit(1);
  }
};

let isShuttingDown = false;
const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress. Ignoring signal.');
    return;
  }
  isShuttingDown = true;
  logger.warn(`Received signal: ${signal}. Shutting down API service gracefully...`);

  server.close(async (err?: Error) => {
    if (err) {
      logger.error('Error during HTTP server close:', err);
    }
    logger.info('HTTP server closed.');

    await Promise.all([closePool(), closeRedisConnection()]);

    logger.info('Graceful shutdown complete.');
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcefully shutting down API service.');
    process.exit(1);
  }, SERVER_SHUTDOWN_TIMEOUT);
};

errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    logger.error(`Unhandled process error (${type}):`, error);
    if (!isShuttingDown) await shutdown(`unhandled_${type}`);
  });
});

signalTraps.forEach((type) => {
  process.once(type, async () => {
    if (!isShuttingDown) await shutdown(type);
  });
});

startServer();

export default app;
