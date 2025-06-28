import { Router, Request, Response } from 'express';
import loggerUtil from '@root/logger.util.js';

import cryptoRoutes from './crypto.routes.js';

const logger = loggerUtil('main-router');
const router = Router();

router.get('/health', (req: Request, res: Response) => {
  logger.info('Health check endpoint hit');
  res.status(200).json({
    status: 'UP',
    message: 'API service is healthy',
    timestamp: new Date().toISOString(),
  });
});

router.use('/cryptos', cryptoRoutes);

router.get('/', (req: Request, res: Response) => {
  logger.info('Main API router root hit');
  res.status(200).json({
    message: 'Crypto Pulse API - Main Router',
    availableSubRoutes: ['/health', '/cryptos'],
  });
});

export default router;
