// frontend/src/components/__tests__/CoinBlock.test.tsx
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import CoinBlock, { type CoinData } from '../CoinBlock/CoinBlock';

vi.mock('@observablehq/plot', () => ({
  lineY: vi.fn(() => ({
    plot: () => document.createElement('div'),
  })),
}));

describe('CoinBlock Component', () => {
  const mockCoinData: CoinData = {
    coinId: 'bitcoin',
    currency: 'usd',
    priceHistory: [
      { price: 64000, time: new Date('2025-08-14T01:00:00Z') },
      { price: 65000.55, time: new Date('2025-08-14T01:05:00Z') },
    ],
  };

  it('should render the coin ID', () => {
    // Arrange
    render(<CoinBlock {...mockCoinData} />);

    // Assert
    expect(screen.getByText('bitcoin')).toBeInTheDocument();
  });

  it('should render the latest price and currency via the PriceBlock', () => {
    // Arrange
    render(<CoinBlock {...mockCoinData} />);

    // Assert
    expect(screen.getByText('65,000.55')).toBeInTheDocument();
    expect(screen.getByText('usd')).toBeInTheDocument();
  });

  it('should render the PlotBlock with its loading message when history is short', () => {
    // Arrange
    const shortHistoryData: CoinData = {
      ...mockCoinData,
      priceHistory: [mockCoinData.priceHistory[0]], // Only one data point
    };
    render(<CoinBlock {...shortHistoryData} />);
    
    // Assert
    expect(screen.getByText('Gathering data...')).toBeInTheDocument();
  });

  it('should render a price of 0.00 when price history is empty', () => {
    // Arrange
    const emptyHistoryData: CoinData = {
      ...mockCoinData,
      priceHistory: [],
    };
    render(<CoinBlock {...emptyHistoryData} />);

    // Assert
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });
});