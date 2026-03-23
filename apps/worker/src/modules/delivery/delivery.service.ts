import { logger } from '../../shared/logger';

import { PipelineSubscriber } from '../../db/pipelines.repository';
import { Job } from '../jobs/jobs.types';
import {
  createDeliveryAttempt,
  getDeliveryAttemptCount,
  updateDeliveryAttempt,
} from './delivery.repository';
import { sendPost } from './http.client';

export type DeliveryResult = {
  subscriberId: string;
  attemptNo: number;
  success: boolean;
  retryable: boolean;
};

export type DeliverJobResultsResult = {
  allSucceeded: boolean;
  results: DeliveryResult[];
};

function computeNextRetryAt(retryBackoffMs: number): Date {
  return new Date(Date.now() + retryBackoffMs);
}

function isDiscordWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const isDiscordHost =
      parsedUrl.hostname === 'discord.com' || parsedUrl.hostname === 'discordapp.com';

    return isDiscordHost && parsedUrl.pathname.startsWith('/api/webhooks/');
  } catch {
    return false;
  }
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return 'unknown';
}

function buildDiscordMessageContent(payload: Record<string, unknown>): string {
  const orderId = toDisplayValue(payload.orderId);
  const customerName = toDisplayValue(payload.customerName);
  const amount = toDisplayValue(payload.amount);
  const status = toDisplayValue(payload.status);

  return `New order received: #${orderId} | Customer: ${customerName} | Amount: ${amount} | Status: ${status}`;
}

function buildSubscriberRequestBody(
  job: Job,
  subscriber: PipelineSubscriber,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (isDiscordWebhookUrl(subscriber.targetUrl)) {
    return {
      content: buildDiscordMessageContent(payload),
    };
  }

  return {
    jobId: job.id,
    pipelineId: job.pipelineId,
    payload,
  };
}

// Delivers one job payload to one subscriber and records attempt state.
export async function deliverToSubscriber(
  job: Job,
  subscriber: PipelineSubscriber,
  payload: Record<string, unknown>,
): Promise<DeliveryResult> {
  const attemptCount = await getDeliveryAttemptCount(job.id, subscriber.id);
  const attemptNo = attemptCount + 1;

  const attempt = await createDeliveryAttempt({
    jobId: job.id,
    subscriberId: subscriber.id,
    attemptNo,
  });
  const requestBody = buildSubscriberRequestBody(job, subscriber, payload);

  const startedAt = new Date();

  await updateDeliveryAttempt(attempt.id, {
    status: 'in_progress',
    startedAt,
    requestPayload: requestBody,
  });

  logger.info('Delivery attempt started', {
    source: 'delivery',
    jobId: job.id,
    pipelineId: job.pipelineId,
    subscriberId: subscriber.id,
    attemptNo,
  });

  try {
    const response = await sendPost(
      subscriber.targetUrl,
      requestBody,
      subscriber.timeoutMs,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      await updateDeliveryAttempt(attempt.id, {
        status: 'succeeded',
        finishedAt: new Date(),
        responseStatusCode: response.statusCode,
        responseBody: response.body,
        durationMs: response.durationMs,
        nextRetryAt: null,
      });

      logger.info('Delivery succeeded', {
        source: 'delivery',
        jobId: job.id,
        pipelineId: job.pipelineId,
        subscriberId: subscriber.id,
        attemptNo,
        statusCode: response.statusCode,
        durationMs: response.durationMs,
      });

      return {
        subscriberId: subscriber.id,
        attemptNo,
        success: true,
        retryable: false,
      };
    }

    const retryable = attemptNo < subscriber.maxRetries;

    await updateDeliveryAttempt(attempt.id, {
      status: retryable ? 'failed_retryable' : 'failed_final',
      finishedAt: new Date(),
      responseStatusCode: response.statusCode,
      responseBody: response.body,
      errorMessage: `Subscriber responded with status ${response.statusCode}`,
      durationMs: response.durationMs,
      nextRetryAt: retryable ? computeNextRetryAt(subscriber.retryBackoffMs) : null,
    });

    logger.warn('Delivery failed', {
      source: 'delivery',
      jobId: job.id,
      pipelineId: job.pipelineId,
      subscriberId: subscriber.id,
      attemptNo,
      retryable,
      statusCode: response.statusCode,
    });

    return {
      subscriberId: subscriber.id,
      attemptNo,
      success: false,
      retryable,
    };
  } catch (error) {
    const retryable = attemptNo < subscriber.maxRetries;
    const message = error instanceof Error ? error.message : 'Delivery request failed';
    const durationMs = Date.now() - startedAt.getTime();

    await updateDeliveryAttempt(attempt.id, {
      status: retryable ? 'failed_retryable' : 'failed_final',
      finishedAt: new Date(),
      errorMessage: message,
      durationMs,
      nextRetryAt: retryable ? computeNextRetryAt(subscriber.retryBackoffMs) : null,
    });

    logger.warn('Delivery failed', {
      source: 'delivery',
      jobId: job.id,
      pipelineId: job.pipelineId,
      subscriberId: subscriber.id,
      attemptNo,
      retryable,
      error: message,
      durationMs,
    });

    return {
      subscriberId: subscriber.id,
      attemptNo,
      success: false,
      retryable,
    };
  }
}

// Delivers one processed job result to all enabled subscribers.
export async function deliverJobResults(
  job: Job,
  subscribers: PipelineSubscriber[],
  payload: Record<string, unknown>,
): Promise<DeliverJobResultsResult> {
  const enabledSubscribers = subscribers.filter((subscriber) => subscriber.enabled);
  const results: DeliveryResult[] = [];

  for (const subscriber of enabledSubscribers) {
    const result = await deliverToSubscriber(job, subscriber, payload);
    results.push(result);
  }

  return {
    allSucceeded: results.every((result) => result.success),
    results,
  };
}
