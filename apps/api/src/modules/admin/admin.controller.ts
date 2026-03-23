import { Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { resetRuntimeData } from './admin.repository';

export async function resetRuntimeDataHandler(_req: Request, res: Response): Promise<void> {
  try {
    const result = await resetRuntimeData();

    res.status(200).json({
      data: {
        ...result,
        message: 'Runtime demo data reset successfully.',
      },
    });
  } catch (error) {
    logger.error('Admin reset runtime data failed', {}, error);

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset runtime data.',
      },
    });
  }
}
