import styles from './CoinBlock.module.css';
import PriceBlock from './PriceBlock/PriceBlock';
import PlotBlock from './PlotBlock/PlotBlock';
import { PriceHistoryPoint } from 'App';

type CoinData = {
  coinId: string;
  currency: string;
  priceHistory: Array<PriceHistoryPoint>;
};

export default function CoinBlock({ coinId, currency, priceHistory }: CoinData) {
  const latestPrice = priceHistory.at(-1)?.price || 0;
  return <div className={styles.container}>
    <div className={styles.coin}>
      {coinId}
    </div>
    <PriceBlock
      currency={currency}
      price={latestPrice}
    />
    <PlotBlock
      priceHistory={priceHistory}
    />
  </div>;
}
