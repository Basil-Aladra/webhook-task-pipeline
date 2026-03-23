import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../../shared/logger';
import { getLogs } from './logs.repository';
import { listLogsQuerySchema } from './logs.types';

export async function getLogsHandler(req: Request, res: Response): Promise<void> {
  try {
    const query = listLogsQuerySchema.parse(req.query);
    const logs = await getLogs(query);

    res.status(200).json({
      data: logs,
      meta: {
        total: logs.length,
        limit: query.limit,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: error.issues,
        },
      });
      return;
    }

    logger.error('Logs API error', {}, error);

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
