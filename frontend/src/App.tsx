import { useState, useEffect, useRef } from 'react';
import CoinBlock from '@components/CoinBlock/CoinBlock';
import Header from '@components/Header/Header';
import Footer from '@components/Footer/Footer';
import styles from './App.module.css';
import { getInitialCoinData } from '@services/api';

export type CoinObject = {
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
const MAX_HISTORY_LENGTH = 100;

function App() {
  const [allCoinsData, setAllCoinsData] = useState<AllCoinsState>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const reconnectTimerId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      console.log("Fetching initial historical data...");
      setIsLoading(true);
      try {
        const initialData = await getInitialCoinData();
        setAllCoinsData(initialData);
        console.log("Initial data loaded successfully.");
      } catch (error) {
        console.error("Failed to fetch initial coin data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!WEBSOCKET_URL) {
      console.error("WebSocket URL is not configured!");
      return;
    }

    let wsInstance: WebSocket;
    let reconnectAttempts = 0;

    const connect = () => {
      wsInstance = new WebSocket(WEBSOCKET_URL);

      wsInstance.addEventListener('open', () => {
        console.log('WebSocket: Connected to server');
        setIsConnected(true);
        reconnectAttempts = 0;
        if (reconnectTimerId.current) {
          clearTimeout(reconnectTimerId.current);
        }
      });

      wsInstance.addEventListener('message', (event: MessageEvent) => {
        let parsedMessage: CoinObject | null = null;
        try {
          if (typeof event.data === 'string') parsedMessage = JSON.parse(event.data);
        } catch (error) {
          console.error(`WebSocket: Error parsing payload: "${event.data}".`, error);
          return;
        }

        if (parsedMessage && parsedMessage.coinId) {
          const { coinId, price, currency, timestamp } = parsedMessage;
          setAllCoinsData((prevAllCoinsData) => {
            const existingHistory = prevAllCoinsData[coinId]?.priceHistory || [];
            const newHistoryPoint = { price, time: new Date(timestamp) };

            const updatedHistory = [...existingHistory, newHistoryPoint].slice(-MAX_HISTORY_LENGTH);

            return {
              ...prevAllCoinsData,
              [coinId]: { priceHistory: updatedHistory, currency },
            };
          });
        }
      });

      wsInstance.addEventListener('error', (errorEvent: Event) => {
        console.error('WebSocket: Error occurred:', errorEvent);
      });

      wsInstance.addEventListener('close', (event: CloseEvent) => {
        console.log(`WebSocket: Disconnected - Code ${event.code}`);
        setIsConnected(false);

        const maxReconnectAttempts = 5;
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttempts) * 1000;
          reconnectAttempts++;
          console.log(`Attempting to reconnect in ${delay / 1000}s (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`);
          reconnectTimerId.current = setTimeout(connect, delay);
        } else {
          console.error('WebSocket: Max reconnection attempts reached.');
        }
      });
    };

    connect();

    return () => {
      console.log('Cleaning up WebSocket connection and timers.');

      if (reconnectTimerId.current) {
        clearTimeout(reconnectTimerId.current);
      }

      if (wsInstance) {
          wsInstance.close();
      }
    };
  }, [WEBSOCKET_URL]);

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading initial data...</p>;
    }

    if (Object.keys(allCoinsData).length === 0) {
        return <p>No cryptocurrency data to display. Please check the configuration.</p>
    }

    return Object.entries(allCoinsData).map(([coinId, data]) => (
        <CoinBlock
            key={coinId}
            coinId={coinId}
            priceHistory={data.priceHistory}
            currency={data.currency}
        />
    ));
  }

  return (
    <>
      <Header isConnected={isConnected} />
      <div className={styles.main}>
        {renderContent()}
      </div>
      <Footer />
    </>
  );
}

export default App;
