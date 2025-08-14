import { vi, describe, beforeEach, it, expect } from 'vitest';
import { fetchData, pushMessages } from '../index.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const { mockKafkaSend, mockKafkaConnect, mockKafkaDisconnect } = vi.hoisted(() => {
  return {
    mockKafkaSend: vi.fn(),
    mockKafkaConnect: vi.fn(),
    mockKafkaDisconnect: vi.fn(),
  }
});

vi.mock('kafkajs', () => {
  return {
    default: {
      Kafka: vi.fn(() => ({
        producer: vi.fn(() => ({
          connect: mockKafkaConnect,
          send: mockKafkaSend,
          disconnect: mockKafkaDisconnect,
        })),
      })),
      logLevel: {},
      CompressionTypes: { GZIP: 2 },
      KafkaJSError: class KafkaJSError extends Error {},
    },
  };
});
vi.mock('@root/logger.util.js', () => ({
  default: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Data Fetcher Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchData', () => {
    it('should call the CoinGecko API with the correct URL and return data on success', async () => {
      // Arrange
      const mockApiResponse = { bitcoin: { usd: 50000 } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      // Act
      const result = await fetchData();

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.coingecko.com/api/v3/simple/price'),
        expect.any(Object)
      );
      expect(result).toEqual(mockApiResponse);
    });

    it('should return null if the API response is not ok', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: () => Promise.resolve('Rate limit exceeded'),
      });

      // Act
      const result = await fetchData();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('pushMessages', () => {
    it('should format the payload correctly and send messages to Kafka', async () => {
      // Arrange
      const payload = {
        bitcoin: { usd: 51000 },
        ethereum: { usd: 4100 },
      };

      // Act
      await pushMessages(payload);

      // Assert
      expect(mockKafkaSend).toHaveBeenCalledTimes(1);
      expect(mockKafkaSend).toHaveBeenCalledWith({
        topic: 'crypto-updates',
        compression: 2, // CompressionTypes.GZIP
        messages: [
          {
            key: 'bitcoin',
            value: expect.stringContaining('"price":51000'),
          },
          {
            key: 'ethereum',
            value: expect.stringContaining('"price":4100'),
          },
        ],
      });
    });

    it('should not send messages if the payload is null or empty', async () => {
      // Act
      await pushMessages(null);
      await pushMessages({});

      // Assert
      expect(mockKafkaSend).not.toHaveBeenCalled();
    });

    it('should filter out entries that do not have a valid price', async () => {
        // Arrange
        const payload = {
          bitcoin: { usd: 51000 },
          cardano: { eur: 1.5 }, // No 'usd' price
        };
  
        // Act
        await pushMessages(payload);
  
        // Assert
        expect(mockKafkaSend).toHaveBeenCalledTimes(1);
        const sentMessages = mockKafkaSend.mock.calls[0][0].messages;
        expect(sentMessages).toHaveLength(1);
        expect(sentMessages[0].key).toBe('bitcoin');
      });
  });
});
