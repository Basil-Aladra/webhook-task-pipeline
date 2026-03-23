import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { logger } from './shared/logger';

import { apiRateLimiter, webhookRateLimiter } from './middleware/rateLimiter';

import jobsRouter from './modules/jobs/jobs.routes';
import metricsRouter from './modules/metrics/metrics.routes';
import pipelinesRouter from './modules/pipelines/pipelines.routes';
import webhooksRouter from './modules/webhooks/webhooks.routes';

// Load environment variables from .env when running locally.
dotenv.config();

const app = express();
const apiPort = Number(process.env.API_PORT) || 3000;

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

// Mount versioned API routes.
app.use('/api/v1', pipelinesRouter);
app.use('/api/v1', webhooksRouter);
app.use('/api/v1', jobsRouter);
app.use('/api/v1', metricsRouter);

// Simple health endpoint used by local checks and container health probes.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(apiPort, () => {
  logger.info('API service started', { port: apiPort });
});
