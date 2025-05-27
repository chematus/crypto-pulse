import styles from './PriceBlock.module.css';

type PriceObject = {
  price: number;
  currency: string;
};

export default function PriceBlock({ price, currency }: PriceObject) {
  const formatPrice = (value: number) => {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return <div className={styles.container}>
      <div className={styles.price}>
        {formatPrice(price)}
      </div>
      <div className={styles.currency}>
        {currency}
      </div>
    </div>;
};
