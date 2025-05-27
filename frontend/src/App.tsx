import { useState, useEffect } from 'react';
import CoinBlock from '@components/CoinBlock/CoinBlock';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import styles from './App.module.css';

type CoinObject = {
  coinId: string;
  price: number;
  currency: string;
  timestamp: string;
};

export type PriceHistoryPoint = {
  price: number;
  time: Date;
};

export interface CoinDataForDisplay {
    priceHistory: Array<PriceHistoryPoint>;
    currency: string;
}

export interface AllCoinsState {
  [key: string]: CoinDataForDisplay;
}

const WEBSOCKET_URL = process.env.REACT_APP_WEBSOCKET_URL;

function App() {
  const [allCoinsData, setAllCoinsData] = useState<AllCoinsState>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
     if (!WEBSOCKET_URL) {
      return;
    }

    console.log('Attempting to connect to WebSocket at:', WEBSOCKET_URL);
    
    const ws = new WebSocket(WEBSOCKET_URL);

    const handleOpen = () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
    };

    const handleMessage = (event: MessageEvent) => {
      let parsedMessage: CoinObject | null = null;

      try {
        if (typeof event.data === 'string') {
          parsedMessage = JSON.parse(event.data);
        } else {
          console.warn('Received non-string WebSocket message:', event.data);
          return;
        }
      } catch (error) {
        console.error(`Error parsing WebSocket payload: "${event.data}". Skipping.`, error);
        return;
      }

      if (parsedMessage && parsedMessage.coinId) {
        const { coinId, price, currency, timestamp } = parsedMessage;

        setAllCoinsData((prevAllCoinsData) => {
          const existingCoinData = prevAllCoinsData[coinId];
          const existingHistory = existingCoinData?.priceHistory || [];
          const newHistoryPoint = { price, time: new Date(timestamp) };

          const MAX_HISTORY_LENGTH = 100;
          const updatedHistory = [...existingHistory, newHistoryPoint].slice(-MAX_HISTORY_LENGTH);

          return {
            ...prevAllCoinsData,
            [coinId]: {
              priceHistory: updatedHistory,
              currency,
            },
          };
        });
      } else {
        console.warn('Received WebSocket message without coinId or invalid format:', parsedMessage);
      }
    };

    const handleError = (error: Event) => {
      console.error('WebSocket error occurred:', error);
      setIsConnected(false);
    };

    const handleClose = (event: CloseEvent) => {
      console.log(`WebSocket disconnected: Code ${event.code}, Reason: ${event.reason}`);
      setIsConnected(false);
    };

    ws.addEventListener('open', handleOpen);
    ws.addEventListener('message', handleMessage);
    ws.addEventListener('error', handleError);
    ws.addEventListener('close', handleClose);

    return () => {
      console.log('Cleaning up WebSocket event listeners.');
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('error', handleError);
      ws.removeEventListener('close', handleClose);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
        console.log('WebSocket connection closed.');
      }
    };
  }, []);

  return (
    <>
      <Header />
      <div className={styles.main}>
        {Object.keys(allCoinsData).length === 0 && !isConnected && (
          <p>Attempting to connect to WebSocket server...</p>
        )}
        {Object.keys(allCoinsData).length === 0 && isConnected && (
          <p>Connected. Waiting for cryptocurrency data...</p>
        )}
        {Object.entries(allCoinsData).map(([coinId, data]) => (
          <CoinBlock
            key={coinId}
            coinId={coinId}
            priceHistory={data.priceHistory}
            currency={data.currency}
          />
        ))}
      </div>
      <Footer />
    </>
  );
}

export default App;
