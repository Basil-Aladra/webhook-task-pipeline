import { Request, Response } from 'express';
import { logger } from '../../shared/logger';
import { ZodError } from 'zod';

import {
  ingestWebhook,
  PipelineNotActiveError,
  WebhookPipelineNotFoundError,
} from './webhooks.service';
import { ingestWebhookRequestSchema, webhookPathParamSchema } from './webhooks.types';

// POST /webhooks/:webhookPath handler.
// This endpoint only validates and queues jobs, then returns quickly.
export async function ingestWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const { webhookPath } = webhookPathParamSchema.parse(req.params);
    const parsedBody = ingestWebhookRequestSchema.parse(req.body);
    const requestId = req.header('x-request-id') ?? undefined;

    const result = await ingestWebhook(webhookPath, parsedBody);

    logger.info('Webhook received', {
      requestId,
      path: webhookPath,
      pipelineId: result.pipelineId,
    });

    logger.info('Webhook job queued', {
      requestId,
      path: webhookPath,
      pipelineId: result.pipelineId,
      jobId: result.jobId,
    });

    res.status(202).json({
      data: {
        jobId: result.jobId,
        status: result.status,
        message: 'Job queued',
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Webhook validation failed', {
        details: error.issues,
      });

      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: error.issues,
        },
      });
      return;
    }

    if (error instanceof WebhookPipelineNotFoundError) {
      res.status(404).json({
        error: {
          code: 'PIPELINE_NOT_FOUND',
          message: error.message,
        },
      });
      return;
    }

    if (error instanceof PipelineNotActiveError) {
      res.status(409).json({
        error: {
          code: 'PIPELINE_NOT_ACTIVE',
          message: error.message,
        },
      });
      return;
    }

    logger.error('Webhook ingestion failed', {}, error);

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  }
}
