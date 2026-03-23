import { Pool, PoolClient } from 'pg';

import { pool } from '../../db/pool';
import { Job, JobStatus, UpdateJobStatusExtra } from './jobs.types';

type Queryable = Pool | PoolClient;
type TimestampValue = string | Date;

type DatabaseJobRow = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  available_at: TimestampValue;
  locked_at: TimestampValue | null;
  locked_by: string | null;
  lock_expires_at: TimestampValue | null;
  processing_attempt_count: number;
  result_payload: Record<string, unknown> | null;
  last_error: Record<string, unknown> | null;
  received_at: TimestampValue;
  started_at: TimestampValue | null;
  completed_at: TimestampValue | null;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

function toIsoString(value: TimestampValue | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapDatabaseJob(row: DatabaseJobRow): Job {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    status: row.status,
    payload: row.payload,
    idempotencyKey: row.idempotency_key,
    availableAt: toIsoString(row.available_at) ?? new Date().toISOString(),
    lockedAt: toIsoString(row.locked_at),
    lockedBy: row.locked_by,
    lockExpiresAt: toIsoString(row.lock_expires_at),
    processingAttemptCount: row.processing_attempt_count,
    resultPayload: row.result_payload,
    lastError: row.last_error,
    receivedAt: toIsoString(row.received_at) ?? new Date().toISOString(),
    startedAt: toIsoString(row.started_at),
    completedAt: toIsoString(row.completed_at),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

// Fetches and locks the next available queued job.
// Uses FOR UPDATE SKIP LOCKED to prevent two workers from taking the same job.
export async function fetchNextJob(db: Queryable = pool): Promise<Job | null> {
  const workerId = process.env.WORKER_ID || 'worker-1';

  const query = `
    UPDATE jobs
    SET
      status = 'processing',
      locked_at = now(),
      locked_by = $1,
      lock_expires_at = now() + interval '5 minutes',
      started_at = now(),
      processing_attempt_count = processing_attempt_count + 1,
      updated_at = now()
    WHERE id = (
      SELECT id
      FROM jobs
      WHERE status = 'queued'
        AND available_at <= now()
      ORDER BY available_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING
      id,
      pipeline_id,
      status,
      payload,
      idempotency_key,
      available_at,
      locked_at,
      locked_by,
      lock_expires_at,
      processing_attempt_count,
      result_payload,
      last_error,
      received_at,
      started_at,
      completed_at,
      created_at,
      updated_at
  `;

  const result = await db.query<DatabaseJobRow>(query, [workerId]);

  if (result.rowCount === 0) {
    return null;
  }

  return mapDatabaseJob(result.rows[0]);
}

// Re-queues jobs that were locked by a worker but never completed (for example after a crash).
// This keeps the queue moving instead of leaving jobs stuck in "processing" forever.
export async function recoverExpiredProcessingJobs(
  db: Queryable = pool,
): Promise<string[]> {
  const query = `
    WITH expired_jobs AS (
      SELECT id
      FROM jobs
      WHERE status = $1
        AND lock_expires_at IS NOT NULL
        AND lock_expires_at < now()
      FOR UPDATE SKIP LOCKED
    ),
    updated_jobs AS (
      UPDATE jobs j
      SET
        status = $2,
        locked_at = NULL,
        locked_by = NULL,
        lock_expires_at = NULL,
        started_at = NULL,
        available_at = now(),
        updated_at = now()
      FROM expired_jobs e
      WHERE j.id = e.id
      RETURNING j.id
    )
    SELECT id
    FROM updated_jobs
  `;

  type RecoveredJobRow = { id: string };
  const result = await db.query<RecoveredJobRow>(query, [
    JobStatus.Processing,
    JobStatus.Queued,
  ]);

  const recoveredJobIds = result.rows.map((row) => row.id);
  for (const jobId of recoveredJobIds) {
    await addJobStatusHistory(
      jobId,
      JobStatus.Processing,
      JobStatus.Queued,
      'Worker lock expired; job re-queued for retry.',
      'worker-recovery',
      db,
    );
  }

  return recoveredJobIds;
}

// Updates job status and optional fields such as result payload or error details.
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  extra: UpdateJobStatusExtra = {},
  db: Queryable = pool,
): Promise<void> {
  const setClauses: string[] = [];
  const values: Array<string | Record<string, unknown> | null> = [];

  values.push(status);
  setClauses.push(`status = $${values.length}`);

  if (extra.resultPayload !== undefined) {
    values.push(extra.resultPayload);
    setClauses.push(`result_payload = $${values.length}`);
  }

  if (extra.lastError !== undefined) {
    values.push(extra.lastError);
    setClauses.push(`last_error = $${values.length}`);
  }

  if (extra.completedAt !== undefined) {
    const completedAtValue =
      extra.completedAt instanceof Date ? extra.completedAt.toISOString() : extra.completedAt;
    values.push(completedAtValue);
    setClauses.push(`completed_at = $${values.length}`);
  }

  setClauses.push('updated_at = now()');

  values.push(jobId);

  const query = `
    UPDATE jobs
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
  `;

  await db.query(query, values);
}

// Adds a status transition entry for job history/audit.
export async function addJobStatusHistory(
  jobId: string,
  fromStatus: JobStatus | null,
  toStatus: JobStatus,
  reason: string | null,
  actor: string,
  db: Queryable = pool,
): Promise<void> {
  const query = `
    INSERT INTO job_status_history (job_id, from_status, to_status, reason, actor)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await db.query(query, [jobId, fromStatus, toStatus, reason, actor]);
}

// Loads a job for worker internal orchestration.
export async function getJobById(jobId: string, db: Queryable = pool): Promise<Job | null> {
  const query = `
    SELECT
      id,
      pipeline_id,
      status,
      payload,
      idempotency_key,
      available_at,
      locked_at,
      locked_by,
      lock_expires_at,
      processing_attempt_count,
      result_payload,
      last_error,
      received_at,
      started_at,
      completed_at,
      created_at,
      updated_at
    FROM jobs
    WHERE id = $1
    LIMIT 1
  `;

  const result = await db.query<DatabaseJobRow>(query, [jobId]);
  if (result.rowCount === 0) {
    return null;
  }

  return mapDatabaseJob(result.rows[0]);
}

export type JobDeliveryOutcome = {
  currentStatus: JobStatus;
  enabledSubscribersCount: number;
  succeededSubscribersCount: number;
  hasFailedFinal: boolean;
};

// Computes whether delivery retry attempts have moved the job into completed/failed_delivery.
export async function computeDeliveryOutcomeForJob(
  jobId: string,
  db: Queryable = pool,
): Promise<JobDeliveryOutcome | null> {
  const query = `
    SELECT
      j.status AS status,
      (
        SELECT COUNT(*)::int
        FROM pipeline_subscribers ps
        WHERE ps.pipeline_id = j.pipeline_id
          AND ps.enabled = true
      ) AS enabled_subscribers_count,
      (
        SELECT COUNT(DISTINCT da.subscriber_id)::int
        FROM delivery_attempts da
        WHERE da.job_id = j.id
          AND da.status = 'succeeded'
      ) AS succeeded_subscribers_count,
      EXISTS (
        SELECT 1
        FROM delivery_attempts da
        WHERE da.job_id = j.id
          AND da.status = 'failed_final'
      ) AS has_failed_final
    FROM jobs j
    WHERE j.id = $1
    LIMIT 1
  `;

  type DeliveryOutcomeRow = {
    status: JobStatus;
    enabled_subscribers_count: number;
    succeeded_subscribers_count: number;
    has_failed_final: boolean;
  };

  const result = await db.query<DeliveryOutcomeRow>(query, [jobId]);
  if (result.rowCount === 0) {
    return null;
  }

  return {
    currentStatus: result.rows[0].status,
    enabledSubscribersCount: result.rows[0].enabled_subscribers_count,
    succeededSubscribersCount: result.rows[0].succeeded_subscribers_count,
    hasFailedFinal: result.rows[0].has_failed_final,
  };
}
