import dotenv from 'dotenv';
import { logger } from './shared/logger';
import { startWorkerHealthServer } from './modules/health/worker-health.server';

import { start } from './modules/worker/worker.runner';

// Load environment variables from .env when running locally.
dotenv.config();

const workerId = process.env.WORKER_ID || 'worker-1';

logger.info('Worker started', {
  workerId,
});
startWorkerHealthServer();
start();
