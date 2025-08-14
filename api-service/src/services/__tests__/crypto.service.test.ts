import {
  vi,
  describe,
  afterAll,
  it,
  expect,
  Mock,
  beforeEach,
} from 'vitest';
import { env } from 'node:process';
import * as CryptoService from '../crypto.service.js';
import * as db from '../../config/db.js';
import redis from '../../config/redis.js';
import { closeRedisConnection } from '../../config/redis.js';

vi.mock('../../config/db.js');
vi.mock('../../config/redis.js');
vi.mock('@root/logger.util.js', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockedDbQuery = db.query as Mock;
const mockedRedisGet = redis.get as Mock;
const mockedRedisSet = redis.set as Mock;
const mockedClosePool = db.closePool as Mock;
const mockedCloseRedisConnection = closeRedisConnection as Mock;

describe('CryptoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await mockedClosePool();
    await mockedCloseRedisConnection();
  });

  describe('getTrackedCoinList', () => {
    it('should return a list of coins from the TRACKED_COIN_IDS environment variable', async () => {
      // Arrange
      env.TRACKED_COIN_IDS = 'cardano,solana';
      
      // Act
      const result = await CryptoService.getTrackedCoinList();
      
      // Assert
      expect(result).toEqual([{ id: 'cardano' }, { id: 'solana' }]);
    });

    it('should return the default list of coins when TRACKED_COIN_IDS is not set', async () => {
      // Arrange
      delete env.TRACKED_COIN_IDS;
      
      // Act
      const result = await CryptoService.getTrackedCoinList();
      
      // Assert
      const expectedCoins = [{ id: 'bitcoin' }, { id: 'ethereum' }];
      expect(result).toEqual(expectedCoins);
    });
  });

  describe('getCoinPriceHistoryById', () => {
    const coinId = 'bitcoin';
    const limit = 50;
    const cacheKey = `history:${coinId}:${limit}`;
    const mockDbHistory = [
      { price: 50000, currency: 'usd', timestamp: new Date().toISOString() },
    ];

    it('should return data from cache if available', async () => {
      // Arrange
      mockedRedisGet.mockResolvedValue(JSON.stringify(mockDbHistory));

      // Act
      const [{ price, currency, timestamp }] = await CryptoService.getCoinPriceHistoryById(coinId, limit);

      // Assert
      expect(mockedRedisGet).toHaveBeenCalledWith(cacheKey);
      expect(mockedDbQuery).not.toHaveBeenCalled();
      expect(price).toEqual(mockDbHistory[0].price);
      expect(currency).toEqual(mockDbHistory[0].currency);
      expect(timestamp).toBeTypeOf('string');
    });

    it('should fetch from DB, set cache, and return data on cache MISS', async () => {
      // Arrange
      mockedRedisGet.mockResolvedValue(null);
      mockedDbQuery.mockResolvedValue({
        rows: mockDbHistory,
        rowCount: mockDbHistory.length,
      });

      // Act
      const [{ price, currency, timestamp }] = await CryptoService.getCoinPriceHistoryById(coinId, limit);

      // Assert
      expect(mockedRedisGet).toHaveBeenCalledWith(cacheKey);
      expect(mockedDbQuery).toHaveBeenCalled();
      expect(mockedRedisSet).toHaveBeenCalledWith(
        cacheKey,
        expect.any(String),
        'EX',
        expect.any(Number)
      );
      expect(price).toEqual(mockDbHistory[0].price);
      expect(currency).toEqual(mockDbHistory[0].currency);
      expect(timestamp).toBeTypeOf('string');
    });

    it('should return an empty array if no history is found in DB and cache', async () => {
      // Arrange
      mockedRedisGet.mockResolvedValue(null);
      mockedDbQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act
      const result = await CryptoService.getCoinPriceHistoryById(coinId, limit);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
