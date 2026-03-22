import { Router } from 'express';

import { getAllJobsHandler, getJobByIdHandler } from './jobs.controller';

const jobsRouter = Router();

// List jobs with optional filters and pagination.
jobsRouter.get('/jobs', getAllJobsHandler);

// Get one job with status history and delivery attempts.
jobsRouter.get('/jobs/:jobId', getJobByIdHandler);

export default jobsRouter;
