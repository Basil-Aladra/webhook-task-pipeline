import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { logger } from './shared/logger';

import { apiRateLimiter, webhookRateLimiter } from './middleware/rateLimiter';
import { apiKeyAuth } from './middleware/apiKeyAuth';

import jobsRouter from './modules/jobs/jobs.routes';
import logsRouter from './modules/logs/logs.routes';
import adminRouter from './modules/admin/admin.routes';
import authRouter from './modules/auth/auth.routes';
import metricsRouter from './modules/metrics/metrics.routes';
import pipelinesRouter from './modules/pipelines/pipelines.routes';
import webhooksRouter from './modules/webhooks/webhooks.routes';
import workerRouter from './modules/worker/worker.routes';

// Load environment variables from .env when running locally.
dotenv.config();

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  // Capture the raw request body bytes so we can compute/verify HMAC signatures.
  // This buffer is available on `req.rawBody` for middleware (see `verifyWebhookSignature`).
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  // Apply rate limiters BEFORE mounting routes.
  // 1) Webhook endpoints are stricter: 60 requests/min/IP.
  app.use('/api/v1/webhooks', webhookRateLimiter);

  // 2) All other API endpoints: 200 requests/min/IP.
  // `apiRateLimiter` skips webhook routes so limits don't stack.
  app.use('/api/v1', apiRateLimiter);

  // Protect management/query endpoints with API keys.
  // These prefixes cover:
  // - /api/v1/pipelines/* (pipeline CRUD)
  // - /api/v1/jobs/* (job status/history queries)
  // - /api/v1/metrics (metrics dashboard queries)
  app.use('/api/v1/pipelines', apiKeyAuth);
  app.use('/api/v1/jobs', apiKeyAuth);
  app.use('/api/v1/metrics', apiKeyAuth);
  app.use('/api/v1/worker', apiKeyAuth);
  app.use('/api/v1/logs', apiKeyAuth);
  app.use('/api/v1/admin', apiKeyAuth);

  // Mount versioned API routes.
  app.use('/api/v1', authRouter);
  app.use('/api/v1', pipelinesRouter);
  app.use('/api/v1', webhooksRouter);
  app.use('/api/v1', jobsRouter);
  app.use('/api/v1', logsRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1', metricsRouter);
  app.use('/api/v1', workerRouter);

  // Express throws a SyntaxError for malformed JSON bodies before route handlers run.
  // Normalize that into the project's standard error response shape.
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      error instanceof SyntaxError &&
      'body' in error &&
      (error as { status?: number }).status === 400
    ) {
      res.status(400).json({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body contains invalid JSON.',
        },
      });
      return;
    }

    next(error);
  });

  // Simple health endpoint used by local checks and container health probes.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const apiPort = Number(process.env.API_PORT) || 3000;

  app.listen(apiPort, () => {
    logger.info('API service started', { port: apiPort });
  });
}
