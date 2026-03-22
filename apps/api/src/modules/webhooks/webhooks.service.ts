import { logger } from '../../shared/logger';

import { pool } from '../../db/pool';
import {
  createJob,
  createJobStatusHistory,
  findJobByIdempotencyKey,
  findPipelineByWebhookPathOrId,
} from './webhooks.repository';
import { IngestWebhookRequest } from './webhooks.types';

export class WebhookPipelineNotFoundError extends Error {
  constructor() {
    super('Pipeline not found.');
    this.name = 'WebhookPipelineNotFoundError';
  }
}

export class PipelineNotActiveError extends Error {
  constructor() {
    super('Pipeline is not active.');
    this.name = 'PipelineNotActiveError';
  }
}

export type IngestWebhookResult = {
  jobId: string;
  pipelineId: string;
  status: 'queued';
};

// Ingests a webhook by validating pipeline state and enqueuing a job.
// IMPORTANT: This function does not process payloads; it only enqueues.
export async function ingestWebhook(
  pipelineIdentifier: string,
  data: IngestWebhookRequest,
): Promise<IngestWebhookResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pipeline = await findPipelineByWebhookPathOrId(pipelineIdentifier, client);

    if (!pipeline) {
      throw new WebhookPipelineNotFoundError();
    }

    if (pipeline.status !== 'active') {
      logger.warn('Webhook rejected because pipeline is not active', {
        pipelineId: pipeline.id,
        pipelineStatus: pipeline.status,
        webhookPath: pipeline.webhookPath,
      });
      throw new PipelineNotActiveError();
    }

    if (data.idempotencyKey) {
      const existingJob = await findJobByIdempotencyKey(pipeline.id, data.idempotencyKey, client);

      if (existingJob) {
        logger.info('Webhook idempotency hit, reusing existing job', {
          pipelineId: pipeline.id,
          jobId: existingJob.id,
          idempotencyKey: data.idempotencyKey,
        });

        await client.query('COMMIT');
        return {
          jobId: existingJob.id,
          pipelineId: pipeline.id,
          status: 'queued',
        };
      }
    }

    const createdJob = await createJob(
      {
        pipelineId: pipeline.id,
        payload: data.payload,
        idempotencyKey: data.idempotencyKey,
      },
      client,
    );

    await createJobStatusHistory(createdJob.id, 'queued', 'api', client);

    await client.query('COMMIT');

    return {
      jobId: createdJob.id,
      pipelineId: pipeline.id,
      status: 'queued',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
