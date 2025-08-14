import { AllCoinsState, PriceHistoryPoint } from 'App';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api/v1';

interface ErrorWithMessage {
  message: string;
}

interface TrackedCoin {
  id: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Fetches the list of tracked coin IDs from the API.
 * 
 * @returns {Promise<TrackedCoin[]>} A promise that resolves to an array of coin IDs.
 */
export const getTrackedCoins = async (): Promise<TrackedCoin[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cryptos`);

    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }

    const data = await response.json();

    return data.trackedCoins || [];
  } catch (error) {
    console.error("Failed to fetch tracked coins:", error);

    return [];
  }
};

/**
 * Fetches the price history for a single coin.
 * 
 * @param {string} coinId - The ID of the coin to fetch history for.
 * @param {number} [limit=100] - The number of data points to fetch.
 * @returns {Promise<PriceHistoryPoint[]>} A promise that resolves to an array of price history points.
 */
export const getCoinHistory = async (coinId: string, limit: number = 100): Promise<PriceHistoryPoint[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/cryptos/${coinId}/history?limit=${limit}`);
    if (!response.ok) {
      const error = new Error(`Failed to fetch history for ${coinId}. Status: ${response.status}`);
      (error as any).response = response;
      throw error;
    }
    const data = await response.json();

    const history: PriceHistoryPoint[] = (data.priceHistory || []).map((point: any) => ({
      ...point,
      time: new Date(point.timestamp),
    }));
    return history;
  } catch (error) {
    const message = isErrorWithMessage(error) ? error.message : 'An unknown error occurred';
    console.error(`Error in getCoinHistory for ${coinId}:`, message);
    throw new Error(message);
  }
};

/**
 * Fetches the initial state for all tracked coins by getting the list
 * and then fetching the history for each one.
 * 
 * @returns {Promise<AllCoinsState>} A promise that resolves to the complete initial state for all coins.
 */
export const getInitialCoinData = async (): Promise<AllCoinsState> => {
  const initialData: AllCoinsState = {};
  const coinIds = await getTrackedCoins();

  if (coinIds.length === 0) {
    console.warn("No tracked coins found from API.");
    return {};
  }

  const promises = coinIds.map(({ id }) => getCoinHistory(id));
  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    const { id: coinId } = coinIds[index];
    if (result.status === 'fulfilled') {
      initialData[coinId] = {
        priceHistory: result.value,
        currency: 'usd',
      };
    } else {
      console.error(`Failed to fetch initial history for ${coinId}:`, result.reason);
      initialData[coinId] = { priceHistory: [], currency: 'usd' };
    }
  });

  return initialData;
};

