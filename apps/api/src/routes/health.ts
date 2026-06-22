import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  logger.info('Health check requested');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

export { router as healthRouter };
