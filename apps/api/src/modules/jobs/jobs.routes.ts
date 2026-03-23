import { Router } from 'express';

import {
  getAllJobsHandler,
  getDeadLetterJobsHandler,
  getJobByIdHandler,
  retryJobHandler,
} from './jobs.controller';

const jobsRouter = Router();

// List jobs with optional filters and pagination.
jobsRouter.get('/jobs', getAllJobsHandler);

// List jobs that are permanently failed delivery (dead letter queue).
// This route must come before /jobs/:jobId to avoid route conflicts.
jobsRouter.get('/jobs/dead-letter', getDeadLetterJobsHandler);

// Manually retry a failed job.
jobsRouter.post('/jobs/:jobId/retry', retryJobHandler);

// Get one job with status history and delivery attempts.
jobsRouter.get('/jobs/:jobId', getJobByIdHandler);

export default jobsRouter;
