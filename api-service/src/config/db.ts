import { Pool, PoolClient, QueryResult } from 'pg';
import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('db-config');

const DB_USER = env.POSTGRES_USER || 'user';
const DB_HOST = env.POSTGRES_HOST || 'postgres';
const DB_DATABASE = env.POSTGRES_DB || 'cryptopulse';
const DB_PASSWORD = env.POSTGRES_PASSWORD || 'password';
const DB_PORT = parseInt(env.POSTGRES_PORT || '5432', 10);

const MAX_CLIENTS = parseInt(env.DB_MAX_CLIENTS || '10', 10);
const IDLE_TIMEOUT_MS = parseInt(env.DB_IDLE_TIMEOUT_MS || '30000', 10);
const CONNECTION_TIMEOUT_MS = parseInt(env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);

logger.info('--- Database Configuration ---');
logger.info(`User: ${DB_USER}`);
logger.info(`Host: ${DB_HOST}`);
logger.info(`Database: ${DB_DATABASE}`);
logger.info(`Port: ${DB_PORT}`);
logger.info(`Max Clients: ${MAX_CLIENTS}`);
logger.info(`Idle Timeout: ${IDLE_TIMEOUT_MS}ms`);
logger.info(`Connection Timeout: ${CONNECTION_TIMEOUT_MS}ms`);
logger.info(`-----------------------------`);

const poolConfig = {
  user: DB_USER,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
  max: MAX_CLIENTS,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
};

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info(`Database client connected. Total clients: ${pool.totalCount}, Idle clients: ${pool.idleCount}`);
});

pool.on('acquire', () => {
  logger.debug(`Database client acquired. Total clients: ${pool.totalCount}, Idle clients: ${pool.idleCount}`);
});

pool.on('remove', () => {
  logger.info(`Database client removed. Total clients: ${pool.totalCount}, Idle clients: ${pool.idleCount}`);
});

pool.on('error', (err, client: PoolClient) => {
  logger.error('Unexpected error on idle database client:', {
    message: err.message,
    stack: err.stack,
    clientDetails: client ? `Client was connected.` : 'No client details available.',
  });
});

/**
 * Executes SQL against the connection pool.
 * Acquires a client, executes the query, and releases the client.
 *
 * @param {string} text - The SQL query text.
 * @param {any[]} [params] - Optional array of parameters for the query.
 * @returns {Promise<QueryResult>} A promise that resolves with the query result.
 * @throws Will throw an error if the query fails.
 */
export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Query executed: ${text.substring(0, 50)}... Duration: ${duration}ms, Rows: ${res.rowCount}`);

    return res;
  } catch (error) {
    logger.error('Database query error:', {
        text,
        error,
    });

    throw error;
  }
};

/**
 * Connects and test the pool.
 * 
 * @returns {Promise<void>}
 */
export const testConnection = async (): Promise<void> => {
  let client: PoolClient | undefined;
  try {
    logger.info('Attempting to connect to the database to test connection...');
    client = await pool.connect();
    logger.info('Successfully connected to the database.');
    await client.query('SELECT NOW()');
    logger.info('Test query successful.');
  } catch (error) {
    logger.error('Failed to connect to the database or execute test query:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
      logger.info('Database client released after test.');
    }
  }
};

/**
 * Closes the pool gracefully.
 * 
 * @returns {Promise<void>}
 */
export const closePool = async (): Promise<void> => {
  logger.info('Closing database connection pool...');
  try {
    await pool.end();
    logger.info('Database connection pool closed successfully.');
  } catch (error) {
    logger.error('Error closing database connection pool:', error);
  }
};

export default pool;
