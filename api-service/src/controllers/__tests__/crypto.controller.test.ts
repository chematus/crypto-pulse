import {
  vi,
  describe,
  it,
  expect,
  Mock,
  beforeEach,
} from 'vitest';
import request from 'supertest';
import app from '../../index.js';
import * as CryptoService from '../../services/crypto.service.js';

vi.mock('../../services/crypto.service.js');
vi.mock('@root/logger.util.js', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockedGetTrackedCoinList = CryptoService.getTrackedCoinList as Mock;
const mockedGetCoinPriceHistoryById = CryptoService.getCoinPriceHistoryById as Mock;

describe('Crypto Controller & Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/cryptos', () => {
    it('should return 200 OK with a list of tracked coins from the service', async () => {
      // Arrange
      const mockCoinList = [{ id: 'bitcoin' }, { id: 'ethereum' }];
      mockedGetTrackedCoinList.mockResolvedValue(mockCoinList);

      // Act
      await request(app)
        .get('/api/v1/cryptos')
        .expect('Content-Type', /json/)
        .expect(200)
        .then((response) => {
          // Assert
          expect(response.body.trackedCoins).toEqual(mockCoinList);
          expect(mockedGetTrackedCoinList).toHaveBeenCalledTimes(1);
        });
    });

    it('should return 500 if the service layer throws an error', async () => {
      // Arrange
      mockedGetTrackedCoinList.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await request(app)
        .get('/api/v1/cryptos')
        .expect('Content-Type', /json/)
        .expect(500)
        .then((response) => {
          // Assert
          expect(response.body.error).toBe('Internal Server Error');
        });
    });
  });

  describe('GET /api/v1/cryptos/:coinId/history', () => {
    it('should return 200 OK with price history for a valid coinId', async () => {
      // Arrange
      const coinId = 'bitcoin';
      const mockHistory = [{ price: 50000, currency: 'usd', timestamp: new Date().toISOString() }];
      mockedGetCoinPriceHistoryById.mockResolvedValue(mockHistory);

      // Act
      await request(app)
        .get(`/api/v1/cryptos/${coinId}/history`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then((response) => {
          // Assert
          expect(response.body.coinId).toBe(coinId);
          expect(response.body.priceHistory).toEqual(mockHistory);
          expect(mockedGetCoinPriceHistoryById).toHaveBeenCalledWith(coinId, undefined); // Check it was called correctly
        });
    });

    it('should correctly pass the "limit" query parameter to the service', async () => {
      // Arrange
      const coinId = 'ethereum';
      const limit = 10;
      mockedGetCoinPriceHistoryById.mockResolvedValue([]);

      // Act
      await request(app)
        .get(`/api/v1/cryptos/${coinId}/history?limit=${limit}`)
        .expect(200);
      
      // Assert
      expect(mockedGetCoinPriceHistoryById).toHaveBeenCalledWith(coinId, limit);
    });

    it('should return 200 OK with an empty array if no history is found', async () => {
      // Arrange
      const coinId = 'nonexistentcoin';
      mockedGetCoinPriceHistoryById.mockResolvedValue([]);

      // Act
      await request(app)
        .get(`/api/v1/cryptos/${coinId}/history`)
        .expect(200)
        .then((response) => {
          // Assert
          expect(response.body.priceHistory).toEqual([]);
        });
    });
  });
});
