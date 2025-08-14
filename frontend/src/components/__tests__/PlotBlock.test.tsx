import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlotBlock from '../CoinBlock/PlotBlock/PlotBlock';
import { type PriceHistoryPoint } from 'App';

const mockPlot = vi.fn(() => document.createElement('div'));
vi.mock('@observablehq/plot', () => ({
  lineY: vi.fn(() => ({
    plot: mockPlot,
  })),
}));

describe('PlotBlock Component', () => {
  it('should display the loading message when price history has less than 2 points', () => {
    // Arrange
    const priceHistory: PriceHistoryPoint[] = [
      { price: 65000, time: new Date() },
    ];
    render(<PlotBlock priceHistory={priceHistory} />);

    // Act & Assert
    expect(screen.getByText('Gathering data...')).toBeInTheDocument();
    expect(mockPlot).not.toHaveBeenCalled();
  });
  
  it('should display the loading message for an empty price history', () => {
    // Arrange
    render(<PlotBlock priceHistory={[]} />);

    // Act & Assert
    expect(screen.getByText('Gathering data...')).toBeInTheDocument();
    expect(mockPlot).not.toHaveBeenCalled();
  });

  it('should attempt to render a plot when price history has 2 or more points', () => {
    // Arrange
    const priceHistory: PriceHistoryPoint[] = [
      { price: 64000, time: new Date('2025-08-14T01:00:00Z') },
      { price: 65000, time: new Date('2025-08-14T01:05:00Z') },
    ];
    render(<PlotBlock priceHistory={priceHistory} />);

    // Act & Assert
    expect(mockPlot).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Gathering data...')).not.toBeInTheDocument();
  });
});
