import { env } from 'node:process';
import loggerUtil from '@root/logger.util.js';
import { query } from '../config/db.js';
import redisClient from '../config/redis.js';

const logger = loggerUtil('crypto-service');

const DEFAULT_TRACKED_COIN_IDS_STRING = 'bitcoin,ethereum';
const DEFAULT_PRICE_HISTORY_LIMIT = 100;
const CACHE_EXPIRATION_SECONDS = 60;

interface PriceDataPoint {
  price: number;
  currency: string;
  timestamp: Date;
}

interface TrackedCoin {
  id: string;
}

/**
 * Retrieves the list of tracked cryptocurrency IDs.
 * 
 * @returns {Promise<TrackedCoin[]>} A promise that resolves to an array of TrackedCoin objects.
 * @throws Will log a warning if no tracked coins are configured or found in environment variables.
 */
export const getTrackedCoinList = async (): Promise<TrackedCoin[]> => {
  logger.info('Service: Fetching list of tracked coins...');
  
  const trackedCoinIdsString = env.TRACKED_COIN_IDS || DEFAULT_TRACKED_COIN_IDS_STRING;
  const coinIds = trackedCoinIdsString
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  if (coinIds.length === 0) {
    logger.warn('Service: No tracked coins configured or found in environment variables.');
  }

  const trackedCoins: TrackedCoin[] = coinIds.map(id => ({ id }));
  return trackedCoins;
};

/**
 * Retrieves the price history for a specific coin from the database.
 *
 * @param {string} coinId - The ID of the coin to fetch history for.
 * @param {number} [limit=DEFAULT_PRICE_HISTORY_LIMIT] - Optional limit for the number of history points to return.
 * @returns {Promise<PriceDataPoint[]>} A promise that resolves to an array of PriceDataPoint objects. Returns empty array if none found.
 * @throws Will re-throw database errors to be handled by the controller.
 */
export const getCoinPriceHistoryById = async (
  coinId: string,
  limit: number = DEFAULT_PRICE_HISTORY_LIMIT
): Promise<PriceDataPoint[]> => {
  logger.info(`Service: Requesting history for ${coinId} with limit ${limit}`);

  if (!coinId) return [];

  const cacheKey = `history:${coinId}:${limit}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.info(`Cache HIT for key: ${cacheKey}`);
      const history: PriceDataPoint[] = JSON.parse(cachedData);

      return history;
    }

    logger.info(`Cache MISS for key: ${cacheKey}. Fetching from database.`);

    const sqlQuery = `
      SELECT price, currency, timestamp
      FROM price_history
      WHERE coin_id = $1
      ORDER BY timestamp DESC
      LIMIT $2;
    `;
    const result = await query(sqlQuery, [coinId, limit]);

    if (result.rowCount === 0) {
      logger.info(`Service: No price history found in DB for coinId: ${coinId}`);
      return [];
    }

    const historyFromDb: PriceDataPoint[] = result.rows.map(row => ({
      price: parseFloat(row.price),
      currency: row.currency,
      timestamp: row.timestamp,
    }));

    if (historyFromDb.length > 0) {
      await redisClient.set(cacheKey, JSON.stringify(historyFromDb), 'EX', CACHE_EXPIRATION_SECONDS);
      logger.info(`Set cache for key: ${cacheKey} with ${CACHE_EXPIRATION_SECONDS}s expiration.`);
    }

    return historyFromDb.reverse();

  } catch (error) {
    logger.error(`Service: Error fetching price history for coinId "${coinId}":`, error);
    throw error;
  }
};
