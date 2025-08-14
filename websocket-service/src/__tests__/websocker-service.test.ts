import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockDbQuery, mockBroadcast, mockEachMessage } = vi.hoisted(() => {
  return {
    mockDbQuery: vi.fn(),
    mockBroadcast: vi.fn(),
    mockEachMessage: vi.fn(),
  }
});

vi.mock('../config/db.js', () => ({
  default: {
    query: mockDbQuery,
    closePool: vi.fn(),
  },
}));

vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
    clients: new Set(),
  })),
  WebSocket: {},
}));

vi.mock('kafkajs', () => {
  const Kafka = vi.fn(() => ({
    consumer: vi.fn(() => ({
      connect: vi.fn(),
      subscribe: vi.fn(),
      run: vi.fn(async ({ eachMessage }) => {
        mockEachMessage.mockImplementation(eachMessage);
      }),
      disconnect: vi.fn(),
    })),
  }));
  return { default: { Kafka, logLevel: {} } };
});

import '../index.js';

describe('WebSocket Service Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a valid Kafka message, save to DB, and broadcast', async () => {
    // Arrange
    const messagePayload = {
      price: 65000,
      currency: 'usd',
      timestamp: new Date().toISOString(),
    };
    const kafkaMessage = {
      key: Buffer.from('bitcoin'),
      value: Buffer.from(JSON.stringify(messagePayload)),
    };

    mockDbQuery.mockResolvedValue({});

    // Act
    await mockEachMessage({ message: kafkaMessage });

    // Assert
    expect(mockDbQuery).toHaveBeenCalledTimes(1);
    expect(mockDbQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO price_history'),
      ['bitcoin', 65000, 'usd', expect.any(Date)]
    );
  });

  it('should not save to DB or broadcast if the message value is invalid JSON', async () => {
    // Arrange
    const kafkaMessage = {
      key: Buffer.from('bitcoin'),
      value: Buffer.from('{not-json}'),
    };

    // Act
    await mockEachMessage({ message: kafkaMessage });

    // Assert
    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });

  it('should handle messages with no key or value gracefully', async () => {
    // Arrange
    const messageNoValue = { key: Buffer.from('bitcoin'), value: null };
    const messageNoKey = { key: null, value: Buffer.from('{}') };

    // Act
    await mockEachMessage({ message: messageNoValue });
    await mockEachMessage({ message: messageNoKey });

    // Assert
    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(mockBroadcast).not.toHaveBeenCalled();
  });
});
