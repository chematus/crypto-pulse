import { Request, Response, NextFunction } from 'express';
import * as CryptoService from '../services/crypto.service.js';
import loggerUtil from '@root/logger.util.js';

const logger = loggerUtil('crypto-controller');

/**
 * Retrieves the list of tracked cryptocurrencies.
 * 
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 */
export const getTrackedCoins = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('Request received for getTrackedCoins');
    const trackedCoins = await CryptoService.getTrackedCoinList();

    res.status(200).json({
      trackedCoins,
      source: 'service-layer',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in getTrackedCoins controller:', error);
    next(error);
  }
};

/**
 * Retrieves the price history for a specific coin.
 * 
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction object
 */
export const getCoinHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { coinId } = req.params;
    const limitQuery = req.query.limit as string | undefined;
    let serviceLimit: number | undefined = undefined;

    if (limitQuery) {
      const parsedLimit = parseInt(limitQuery, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        serviceLimit = parsedLimit;
      } else {
        logger.warn(`Invalid limit query parameter received: "${limitQuery}". Service will use its default.`);
      }
    }

    logger.info(`Request received for getCoinHistory for coinId: ${coinId}${serviceLimit ? ` with limit: ${serviceLimit}` : ' (using service default limit)'}`);

    if (!coinId) {
      res.status(400).json({ message: 'Coin ID parameter is required.' });
      return;
    }

    const priceHistory = await CryptoService.getCoinPriceHistoryById(coinId, serviceLimit);

    if (priceHistory === null) {
      res.status(404).json({
        message: `Price history not found or invalid request for coin ID: ${coinId}`,
        coinId,
      });
      return;
    }
    
    if (priceHistory.length === 0) {
        logger.info(`No price history found by service for coinId: ${coinId}`);
    }

    res.status(200).json({
      coinId,
      priceHistory,
      count: priceHistory.length,
      source: 'service-layer (database via service)',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Error in getCoinHistory controller for coinId ${req.params.coinId}:`, error);
    next(error);
  }
};
