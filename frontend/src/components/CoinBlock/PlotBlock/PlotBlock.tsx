import { useRef, useEffect } from 'react';
import * as Plot from '@observablehq/plot';
import styles from './PlotBlock.module.css';
import { PriceHistoryPoint } from 'App';

const LOADING_MESSAGE = 'Gathering data...';

type PriceHistory = Array<PriceHistoryPoint>;

export default function PlotBlock({ priceHistory }: { priceHistory: PriceHistory }) {
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (plotRef.current) {
      if (priceHistory.length > 1) {
        plotRef.current.innerHTML = '';
        const plot = Plot.lineY(priceHistory, {x: 'time', y: 'price', stroke: 'steelblue', tip: true}).plot({y: {grid: true}});
        plotRef.current.appendChild(plot);
      } else {
        plotRef.current.innerHTML = LOADING_MESSAGE;
      }
    }
  }, [priceHistory]);

  return <div className={styles.container}>
    <div ref={plotRef} />
  </div>;
}
