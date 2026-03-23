import { Router } from 'express';

import {
  cancelDeliveryRetryHandler,
  getAllJobsHandler,
  getDeadLetterJobsHandler,
  getJobByIdHandler,
  replayJobHandler,
  retryDeliveryAttemptHandler,
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

// Queue a fresh replay of an existing job.
jobsRouter.post('/jobs/:jobId/replay', replayJobHandler);

// Force a failed delivery attempt back into the retry queue immediately.
jobsRouter.post('/jobs/:jobId/delivery-attempts/:attemptId/retry', retryDeliveryAttemptHandler);

// Cancel a pending delivery retry.
jobsRouter.post('/jobs/:jobId/delivery-attempts/:attemptId/cancel-retry', cancelDeliveryRetryHandler);

// Get one job with status history and delivery attempts.
jobsRouter.get('/jobs/:jobId', getJobByIdHandler);

export default jobsRouter;
