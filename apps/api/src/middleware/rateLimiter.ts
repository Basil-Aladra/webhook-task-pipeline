import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

type RateLimitResponse = {
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: 'Too many requests, please try again later';
  };
};

function rateLimitExceededResponse(): RateLimitResponse {
  return {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  };
}

// Limits each IP to 60 requests per minute for webhook ingestion endpoints.
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitExceededResponse());
  },
});

// Limits each IP to 200 requests per minute for all API endpoints except webhooks.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  // When mounted at `/api/v1`, webhook routes look like `/webhooks/:webhookPath`.
  // We skip them so only `webhookRateLimiter` applies.
  skip: (req: Request) => /^\/webhooks(\/|$)/.test(req.path),
  handler: (_req: Request, res: Response) => {
    res.status(429).json(rateLimitExceededResponse());
  },
});

