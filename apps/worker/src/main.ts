import dotenv from 'dotenv';
import { logger } from './shared/logger';

import { start } from './modules/worker/worker.runner';

// Load environment variables from .env when running locally.
dotenv.config();

logger.info('Starting worker service...');
start();
