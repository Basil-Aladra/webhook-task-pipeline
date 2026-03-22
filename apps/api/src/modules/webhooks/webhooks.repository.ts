import { Pool, PoolClient } from 'pg';

import { pool } from '../../db/pool';

type Queryable = Pool | PoolClient;

type JobStatus =
  | 'queued'
  | 'processing'
  | 'processed'
  | 'completed'
  | 'failed_processing'
  | 'failed_delivery';

type PipelineRow = {
  id: string;
  status: 'active' | 'paused' | 'archived';
  webhook_path: string;
};

type JobRow = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  idempotency_key: string | null;
  created_at: string | Date;
};

export type JobSummary = {
  id: string;
  pipelineId: string;
  status: JobStatus;
  idempotencyKey: string | null;
  createdAt: string;
};

export type PipelineLookup = {
  id: string;
  status: 'active' | 'paused' | 'archived';
  webhookPath: string;
};

function toIsoString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapJobSummary(row: JobRow): JobSummary {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    createdAt: toIsoString(row.created_at),
  };
}

// Finds pipeline by webhook_path (primary mode) or by id cast to text.
export async function findPipelineByWebhookPathOrId(
  identifier: string,
  db: Queryable = pool,
): Promise<PipelineLookup | null> {
  const query = `
    SELECT id, status, webhook_path
    FROM pipelines
    WHERE webhook_path = $1 OR id::text = $1
    LIMIT 1
  `;

  const result = await db.query<PipelineRow>(query, [identifier]);

  if (result.rowCount === 0) {
    return null;
  }

  return {
    id: result.rows[0].id,
    status: result.rows[0].status,
    webhookPath: result.rows[0].webhook_path,
  };
}

// Finds an existing job by (pipeline_id, idempotency_key).
export async function findJobByIdempotencyKey(
  pipelineId: string,
  idempotencyKey: string,
  db: Queryable = pool,
): Promise<JobSummary | null> {
  const query = `
    SELECT id, pipeline_id, status, idempotency_key, created_at
    FROM jobs
    WHERE pipeline_id = $1 AND idempotency_key = $2
    LIMIT 1
  `;

  const result = await db.query<JobRow>(query, [pipelineId, idempotencyKey]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapJobSummary(result.rows[0]);
}

type CreateJobInput = {
  pipelineId: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

// Creates a queued job record from webhook payload.
export async function createJob(
  data: CreateJobInput,
  db: Queryable = pool,
): Promise<JobSummary> {
  const query = `
    INSERT INTO jobs (
      pipeline_id,
      status,
      payload,
      idempotency_key,
      available_at,
      received_at
    )
    VALUES ($1, 'queued', $2, $3, now(), now())
    RETURNING id, pipeline_id, status, idempotency_key, created_at
  `;

  const values = [data.pipelineId, data.payload, data.idempotencyKey ?? null];
  const result = await db.query<JobRow>(query, values);

  return mapJobSummary(result.rows[0]);
}

// Writes initial job status transition entry.
export async function createJobStatusHistory(
  jobId: string,
  toStatus: 'queued',
  actor: 'api',
  db: Queryable = pool,
): Promise<void> {
  const query = `
    INSERT INTO job_status_history (job_id, from_status, to_status, actor)
    VALUES ($1, NULL, $2, $3)
  `;

  await db.query(query, [jobId, toStatus, actor]);
}
