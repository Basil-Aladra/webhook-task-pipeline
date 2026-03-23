import express from 'express';
import { logger } from '../../shared/logger';
import { getWorkerHealthSnapshot } from './worker-health';

export function startWorkerHealthServer(): void {
  const app = express();
  const healthPort = Number(process.env.WORKER_HEALTH_PORT) || 3001;

  app.get('/internal/worker/health', (_req, res) => {
    res.status(200).json({
      data: getWorkerHealthSnapshot(),
    });
  });

  app.listen(healthPort, () => {
    logger.info('Worker health server started', {
      port: healthPort,
    });
  });
}
