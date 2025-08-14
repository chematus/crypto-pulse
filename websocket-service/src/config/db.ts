import { Pool, QueryResult } from 'pg';
import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('ws-db-config');

const DB_USER = env.POSTGRES_USER || 'user';
const DB_HOST = env.POSTGRES_HOST || 'postgres';
const DB_DATABASE = env.POSTGRES_DB || 'cryptopulse';
const DB_PASSWORD = env.POSTGRES_PASSWORD || 'password';
const DB_PORT = parseInt(env.POSTGRES_PORT || '5432', 10);

const pool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
  max: parseInt(env.DB_MAX_CLIENTS || '5', 10),
  idleTimeoutMillis: parseInt(env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle database client:', {
    message: err.message,
    stack: err.stack,
  });
});

/**
 * Executes a query using the connection pool.
 * 
 * @param {string} text - The SQL query text.
 * @param {any[]} [params] - Optional array of parameters for the query.
 * @returns {Promise<QueryResult>} A promise that resolves with the query result.
 * @throws Will throw an error if the query fails, to be handled by the calling function.
 */
export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed: ${text.substring(0, 40)}... Duration: ${duration}ms`);
    return res;
  } catch (error) {
    logger.error('Database query error:', { text, error });
    throw error;
  }
};

/**
 * Closes the pool gracefully.
 * 
 * @returns {Promise<void>}
 */
export const closePool = async (): Promise<void> => {
  logger.info('Closing database connection pool for WebSocket service...');
  await pool.end();
  logger.info('Database connection pool closed.');
};

export default {
  query,
  closePool,
};
