import { Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { ZodError } from 'zod';

import {
  cancelDeliveryRetry,
  DeliveryAttemptActionResult,
  getAllJobs,
  getDeadLetterJobs,
  getJobById,
  JobsRepositoryError,
  replayJob,
  ReplayJobResult,
  retryDeliveryAttempt,
  retryJob,
} from './jobs.repository';
import { deliveryAttemptParamSchema, jobIdParamSchema, listJobsQuerySchema } from './jobs.types';

function handleJobsError(error: unknown, res: Response): void {
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

  if (error instanceof JobsRepositoryError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  logger.error('Jobs API error', {}, error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
}

// GET /jobs
export async function getAllJobsHandler(req: Request, res: Response): Promise<void> {
  try {
    const query = listJobsQuerySchema.parse(req.query);
    const result = await getAllJobs(query);

    res.status(200).json({
      data: result.items,
      meta: {
        page: query.page,
        limit: query.limit,
        total: result.total,
      },
    });
  } catch (error) {
    handleJobsError(error, res);
  }
}

// GET /jobs/dead-letter
export async function getDeadLetterJobsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const result = await getDeadLetterJobs();

    res.status(200).json({
      data: result.items,
      meta: {
        total: result.total,
      },
    });
  } catch (error) {
    handleJobsError(error, res);
  }
}

// GET /jobs/:jobId
export async function getJobByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = jobIdParamSchema.parse(req.params);
    const job = await getJobById(jobId);

    if (!job) {
      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found.',
        },
      });
      return;
    }

    res.status(200).json({
      data: job,
    });
  } catch (error) {
    handleJobsError(error, res);
  }
}

// POST /jobs/:jobId/retry
export async function retryJobHandler(req: Request, res: Response): Promise<void> {
  const requestId = req.header('x-request-id') ?? undefined;

  try {
    const { jobId } = jobIdParamSchema.parse(req.params);
    const result = await retryJob(jobId);

    if (!result) {
      logger.warn('Manual job retry failed: job not found', {
        requestId,
        jobId,
      });

      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found.',
        },
      });
      return;
    }

    logger.info('Manual job retry scheduled', {
      requestId,
      jobId,
      status: result.status,
    });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    if (error instanceof JobsRepositoryError) {
      logger.warn('Manual job retry rejected', {
        requestId,
        code: error.code,
        details: error.details,
      });
    }

    handleJobsError(error, res);
  }
}

// POST /jobs/:jobId/replay
export async function replayJobHandler(req: Request, res: Response): Promise<void> {
  const requestId = req.header('x-request-id') ?? undefined;

  try {
    const { jobId } = jobIdParamSchema.parse(req.params);
    const result = await replayJob(jobId);

    if (!result) {
      logger.warn('Manual job replay failed: job not found', {
        requestId,
        jobId,
      });

      res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found.',
        },
      });
      return;
    }

    logger.info('Manual job replay queued', {
      requestId,
      jobId: result.newJobId,
      originalJobId: result.originalJobId,
    });

    res.status(200).json({
      data: result satisfies ReplayJobResult,
    });
  } catch (error) {
    if (error instanceof JobsRepositoryError) {
      logger.warn('Manual job replay rejected', {
        requestId,
        code: error.code,
        details: error.details,
      });
    }

    handleJobsError(error, res);
  }
}

// POST /jobs/:jobId/delivery-attempts/:attemptId/retry
export async function retryDeliveryAttemptHandler(req: Request, res: Response): Promise<void> {
  const requestId = req.header('x-request-id') ?? undefined;

  try {
    const { jobId, attemptId } = deliveryAttemptParamSchema.parse(req.params);
    const result = await retryDeliveryAttempt(jobId, attemptId);

    if (!result) {
      logger.warn('Manual delivery retry failed: attempt not found', {
        requestId,
        jobId,
        attemptId,
      });

      res.status(404).json({
        error: {
          code: 'DELIVERY_ATTEMPT_NOT_FOUND',
          message: 'Delivery attempt not found.',
        },
      });
      return;
    }

    logger.info('Manual delivery retry scheduled', {
      requestId,
      jobId,
      attemptId,
      status: result.status,
    });

    res.status(200).json({
      data: result satisfies DeliveryAttemptActionResult,
    });
  } catch (error) {
    if (error instanceof JobsRepositoryError) {
      logger.warn('Manual delivery retry rejected', {
        requestId,
        code: error.code,
        details: error.details,
      });
    }

    handleJobsError(error, res);
  }
}

// POST /jobs/:jobId/delivery-attempts/:attemptId/cancel-retry
export async function cancelDeliveryRetryHandler(req: Request, res: Response): Promise<void> {
  const requestId = req.header('x-request-id') ?? undefined;

  try {
    const { jobId, attemptId } = deliveryAttemptParamSchema.parse(req.params);
    const result = await cancelDeliveryRetry(jobId, attemptId);

    if (!result) {
      logger.warn('Manual delivery retry cancel failed: attempt not found', {
        requestId,
        jobId,
        attemptId,
      });

      res.status(404).json({
        error: {
          code: 'DELIVERY_ATTEMPT_NOT_FOUND',
          message: 'Delivery attempt not found.',
        },
      });
      return;
    }

    logger.info('Manual delivery retry cancelled', {
      requestId,
      jobId,
      attemptId,
      status: result.status,
    });

    res.status(200).json({
      data: result satisfies DeliveryAttemptActionResult,
    });
  } catch (error) {
    if (error instanceof JobsRepositoryError) {
      logger.warn('Manual delivery retry cancel rejected', {
        requestId,
        code: error.code,
        details: error.details,
      });
    }

    handleJobsError(error, res);
  }
}
