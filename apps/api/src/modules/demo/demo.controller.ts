import { Request, Response } from 'express';
import { logger } from '../../shared/logger';

function buildResponsePreview(body: unknown): Record<string, unknown> {
  if (!body || Array.isArray(body) || typeof body !== 'object') {
    return {};
  }

  return body as Record<string, unknown>;
}

export async function demoSubscriberSuccessHandler(req: Request, res: Response): Promise<void> {
  logger.info('Demo subscriber received successful delivery', {
    source: 'system',
    correlationId: req.header('x-request-id') ?? undefined,
    preview: buildResponsePreview(req.body),
  });

  res.status(200).json({
    data: {
      scenario: 'success',
      message: 'Demo subscriber accepted the delivery.',
    },
  });
}

export async function demoSubscriberRetryableFailureHandler(
  req: Request,
  res: Response,
): Promise<void> {
  logger.warn('Demo subscriber forced retryable failure', {
    source: 'system',
    correlationId: req.header('x-request-id') ?? undefined,
    preview: buildResponsePreview(req.body),
  });

  res.status(500).json({
    error: {
      code: 'DEMO_RETRYABLE_FAILURE',
      message: 'Demo subscriber forced a retryable failure.',
    },
  });
}

export async function demoSubscriberFinalFailureHandler(req: Request, res: Response): Promise<void> {
  logger.warn('Demo subscriber forced final failure scenario', {
    source: 'system',
    correlationId: req.header('x-request-id') ?? undefined,
    preview: buildResponsePreview(req.body),
  });

  res.status(500).json({
    error: {
      code: 'DEMO_FINAL_FAILURE',
      message: 'Demo subscriber forced a failure. Use maxRetries=1 for immediate dead-letter demo.',
    },
  });
}
