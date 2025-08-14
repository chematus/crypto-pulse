import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PriceBlock from '../CoinBlock/PriceBlock/PriceBlock';

describe('PriceBlock Component', () => {
  it('should render the price formatted with commas and two decimal places', () => {
    // Arrange
    render(<PriceBlock price={12345.6789} currency="usd" />);

    // Act
    const priceElement = screen.getByText('12,345.68');

    // Assert
    expect(priceElement).toBeInTheDocument();
  });

  it('should render the currency as provided', () => {
    // Arrange
    render(<PriceBlock price={100} currency="usd" />);

    // Act
    const currencyElement = screen.getByText('usd');

    // Assert
    expect(currencyElement).toBeInTheDocument();
  });

  it('should handle a price of zero correctly', () => {
    // Arrange
    render(<PriceBlock price={0} currency="usd" />);

    // Act
    const priceElement = screen.getByText('0.00');

    // Assert
    expect(priceElement).toBeInTheDocument();
  });

  it('should render prices less than 1 with a leading zero', () => {
    // Arrange
    render(<PriceBlock price={0.123} currency="usd" />);

    // Act
    const priceElement = screen.getByText('0.12');

    // Assert
    expect(priceElement).toBeInTheDocument();
  });
});
