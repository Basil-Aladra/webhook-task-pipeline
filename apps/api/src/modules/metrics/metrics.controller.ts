import { Request, Response } from 'express';
import { logger } from '../../shared/logger';

import { getMetrics } from './metrics.repository';

// GET /metrics
export async function getMetricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getMetrics();

    res.status(200).json({
      data: metrics,
    });
  } catch (error) {
    logger.error('Metrics API error', {}, error);

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
