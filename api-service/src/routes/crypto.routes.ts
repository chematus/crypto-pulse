import { Router } from 'express';
import * as cryptoController from '@controllers/crypto.controller.js';

const router = Router();

router.get('/', cryptoController.getTrackedCoins);
router.get('/:coinId/history', cryptoController.getCoinHistory);

export default router;
