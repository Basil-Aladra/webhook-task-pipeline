import { Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { ZodError } from 'zod';

import { getAllJobs, getJobById } from './jobs.repository';
import { jobIdParamSchema, listJobsQuerySchema } from './jobs.types';

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
