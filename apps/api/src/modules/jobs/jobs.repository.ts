import { Pool, PoolClient } from 'pg';

import { pool } from '../../db/pool';
import { JobStatus, ListJobsQuery } from './jobs.types';

type Queryable = Pool | PoolClient;
type TimestampValue = string | Date;

type JobListRow = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  received_at: TimestampValue;
  started_at: TimestampValue | null;
  completed_at: TimestampValue | null;
  processing_attempt_count: number;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type JobDetailRow = {
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

type JobStatusHistoryRow = {
  id: number;
  job_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor: string;
  metadata: Record<string, unknown> | null;
  changed_at: TimestampValue;
};

type DeliveryAttemptRow = {
  id: number;
  job_id: string;
  subscriber_id: string;
  target_url: string;
  attempt_no: number;
  status: string;
  scheduled_at: TimestampValue;
  started_at: TimestampValue | null;
  finished_at: TimestampValue | null;
  request_payload: Record<string, unknown> | null;
  response_status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  next_retry_at: TimestampValue | null;
  duration_ms: number | null;
  created_at: TimestampValue;
};

type CountRow = {
  total: number;
};

const JOB_LIST_FILTER_SQL = {
  pipelineId: 'j.pipeline_id',
  status: 'j.status',
} as const;

const JOB_COUNT_FILTER_SQL = {
  pipelineId: 'pipeline_id',
  status: 'status',
} as const;

export type JobListItem = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  received_at: string;
  started_at: string | null;
  completed_at: string | null;
  processing_attempt_count: number;
  created_at: string;
  updated_at: string;
};

export type JobStatusHistoryItem = {
  id: number;
  job_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  actor: string;
  metadata: Record<string, unknown> | null;
  changed_at: string;
};

export type DeliveryAttemptItem = {
  id: number;
  job_id: string;
  subscriber_id: string;
  target_url: string;
  attempt_no: number;
  status: string;
  scheduled_at: string;
  started_at: string | null;
  finished_at: string | null;
  request_payload: Record<string, unknown> | null;
  response_status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  next_retry_at: string | null;
  duration_ms: number | null;
  created_at: string;
};

export type JobDetails = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  available_at: string;
  locked_at: string | null;
  locked_by: string | null;
  lock_expires_at: string | null;
  processing_attempt_count: number;
  result_payload: Record<string, unknown> | null;
  last_error: Record<string, unknown> | null;
  received_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  statusHistory: JobStatusHistoryItem[];
  deliveryAttempts: DeliveryAttemptItem[];
};

export type PaginatedJobs = {
  items: JobListItem[];
  total: number;
};

export type DeadLetterJob = {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  payload: Record<string, unknown>;
  result_payload: Record<string, unknown> | null;
  last_error: Record<string, unknown> | null;
  received_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deliveryAttempts: DeliveryAttemptItem[];
};

export type DeadLetterJobsResult = {
  items: DeadLetterJob[];
  total: number;
};

export class JobsRepositoryError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'JobsRepositoryError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export type RetryJobResult = {
  jobId: string;
  status: JobStatus;
  message: string;
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

function mapJobListRow(row: JobListRow): JobListItem {
  return {
    id: row.id,
    pipeline_id: row.pipeline_id,
    status: row.status,
    received_at: toIsoString(row.received_at) ?? new Date().toISOString(),
    started_at: toIsoString(row.started_at),
    completed_at: toIsoString(row.completed_at),
    processing_attempt_count: row.processing_attempt_count,
    created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
    updated_at: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapJobStatusHistoryRow(row: JobStatusHistoryRow): JobStatusHistoryItem {
  return {
    id: row.id,
    job_id: row.job_id,
    from_status: row.from_status,
    to_status: row.to_status,
    reason: row.reason,
    actor: row.actor,
    metadata: row.metadata,
    changed_at: toIsoString(row.changed_at) ?? new Date().toISOString(),
  };
}

function mapDeliveryAttemptRow(row: DeliveryAttemptRow): DeliveryAttemptItem {
  return {
    id: row.id,
    job_id: row.job_id,
    subscriber_id: row.subscriber_id,
    target_url: row.target_url,
    attempt_no: row.attempt_no,
    status: row.status,
    scheduled_at: toIsoString(row.scheduled_at) ?? new Date().toISOString(),
    started_at: toIsoString(row.started_at),
    finished_at: toIsoString(row.finished_at),
    request_payload: row.request_payload,
    response_status_code: row.response_status_code,
    response_body: row.response_body,
    error_message: row.error_message,
    next_retry_at: toIsoString(row.next_retry_at),
    duration_ms: row.duration_ms,
    created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

// Lists jobs with optional pipeline/status filters and pagination.
export async function getAllJobs(
  filters: ListJobsQuery,
  db: Queryable = pool,
): Promise<PaginatedJobs> {
  const whereClauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.pipelineId) {
    values.push(filters.pipelineId);
    // Keep filterable columns on an allowlist so future UI query options cannot inject SQL.
    whereClauses.push(`${JOB_LIST_FILTER_SQL.pipelineId} = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`${JOB_LIST_FILTER_SQL.status} = $${values.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.limit;

  values.push(filters.limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const listQuery = `
    SELECT
      j.id,
      j.pipeline_id,
      j.status,
      j.received_at,
      j.started_at,
      j.completed_at,
      j.processing_attempt_count,
      j.created_at,
      j.updated_at
    FROM jobs j
    ${whereSql}
    ORDER BY j.created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const countWhereClauses: string[] = [];
  const countValues: Array<string | number> = [];

  if (filters.pipelineId) {
    countValues.push(filters.pipelineId);
    countWhereClauses.push(`${JOB_COUNT_FILTER_SQL.pipelineId} = $${countValues.length}`);
  }

  if (filters.status) {
    countValues.push(filters.status);
    countWhereClauses.push(`${JOB_COUNT_FILTER_SQL.status} = $${countValues.length}`);
  }

  const countWhereSql =
    countWhereClauses.length > 0 ? `WHERE ${countWhereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM jobs
    ${countWhereSql}
  `;

  const [jobsResult, countResult] = await Promise.all([
    db.query<JobListRow>(listQuery, values),
    db.query<CountRow>(countQuery, countValues),
  ]);

  return {
    items: jobsResult.rows.map(mapJobListRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

// Returns all status transitions for a single job.
export async function getJobStatusHistory(
  jobId: string,
  db: Queryable = pool,
): Promise<JobStatusHistoryItem[]> {
  const query = `
    SELECT
      id,
      job_id,
      from_status,
      to_status,
      reason,
      actor,
      metadata,
      changed_at
    FROM job_status_history
    WHERE job_id = $1
    ORDER BY changed_at ASC
  `;

  const result = await db.query<JobStatusHistoryRow>(query, [jobId]);
  return result.rows.map(mapJobStatusHistoryRow);
}

// Returns all delivery attempts for a single job with subscriber target_url.
export async function getDeliveryAttempts(
  jobId: string,
  db: Queryable = pool,
): Promise<DeliveryAttemptItem[]> {
  const query = `
    SELECT
      da.id,
      da.job_id,
      da.subscriber_id,
      ps.target_url,
      da.attempt_no,
      da.status,
      da.scheduled_at,
      da.started_at,
      da.finished_at,
      da.request_payload,
      da.response_status_code,
      da.response_body,
      da.error_message,
      da.next_retry_at,
      da.duration_ms,
      da.created_at
    FROM delivery_attempts da
    INNER JOIN pipeline_subscribers ps ON ps.id = da.subscriber_id
    WHERE da.job_id = $1
    ORDER BY da.created_at ASC
  `;

  const result = await db.query<DeliveryAttemptRow>(query, [jobId]);
  return result.rows.map(mapDeliveryAttemptRow);
}

// Returns one job with full details, including status history and delivery attempts.
export async function getJobById(jobId: string, db: Queryable = pool): Promise<JobDetails | null> {
  const jobQuery = `
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
  `;

  const jobResult = await db.query<JobDetailRow>(jobQuery, [jobId]);

  if (jobResult.rowCount === 0) {
    return null;
  }

  const [statusHistory, deliveryAttempts] = await Promise.all([
    getJobStatusHistory(jobId, db),
    getDeliveryAttempts(jobId, db),
  ]);

  const job = jobResult.rows[0];

  return {
    id: job.id,
    pipeline_id: job.pipeline_id,
    status: job.status,
    payload: job.payload,
    idempotency_key: job.idempotency_key,
    available_at: toIsoString(job.available_at) ?? new Date().toISOString(),
    locked_at: toIsoString(job.locked_at),
    locked_by: job.locked_by,
    lock_expires_at: toIsoString(job.lock_expires_at),
    processing_attempt_count: job.processing_attempt_count,
    result_payload: job.result_payload,
    last_error: job.last_error,
    received_at: toIsoString(job.received_at) ?? new Date().toISOString(),
    started_at: toIsoString(job.started_at),
    completed_at: toIsoString(job.completed_at),
    created_at: toIsoString(job.created_at) ?? new Date().toISOString(),
    updated_at: toIsoString(job.updated_at) ?? new Date().toISOString(),
    statusHistory,
    deliveryAttempts,
  };
}

// Returns failed-delivery jobs (dead letter queue) with delivery attempts.
export async function getDeadLetterJobs(db: Queryable = pool): Promise<DeadLetterJobsResult> {
  const query = `
    SELECT
      id,
      pipeline_id,
      status,
      payload,
      result_payload,
      last_error,
      received_at,
      started_at,
      completed_at,
      created_at,
      updated_at
    FROM jobs
    WHERE status = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query<
    Pick<
      JobDetailRow,
      | 'id'
      | 'pipeline_id'
      | 'status'
      | 'payload'
      | 'result_payload'
      | 'last_error'
      | 'received_at'
      | 'started_at'
      | 'completed_at'
      | 'created_at'
      | 'updated_at'
    >
  >(query, ['failed_delivery']);

  const items = await Promise.all(
    result.rows.map(async (row) => {
      const deliveryAttempts = await getDeliveryAttempts(row.id, db);

      return {
        id: row.id,
        pipeline_id: row.pipeline_id,
        status: row.status,
        payload: row.payload,
        result_payload: row.result_payload,
        last_error: row.last_error,
        received_at: toIsoString(row.received_at) ?? new Date().toISOString(),
        started_at: toIsoString(row.started_at),
        completed_at: toIsoString(row.completed_at),
        created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
        updated_at: toIsoString(row.updated_at) ?? new Date().toISOString(),
        deliveryAttempts,
      };
    }),
  );

  return {
    items,
    total: items.length,
  };
}

// Manually retries a failed job using the worker's existing queue/retry flow.
export async function retryJob(jobId: string): Promise<RetryJobResult | null> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const jobResult = await client.query<{ id: string; status: JobStatus }>(
      `
        SELECT id, status
        FROM jobs
        WHERE id = $1
        FOR UPDATE
      `,
      [jobId],
    );

    if (jobResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const currentJob = jobResult.rows[0];
    const retryReason = 'Manual retry requested from dashboard.';

    if (currentJob.status === 'failed_processing') {
      await client.query(
        `
          UPDATE jobs
          SET
            status = 'queued',
            available_at = now(),
            locked_at = NULL,
            locked_by = NULL,
            lock_expires_at = NULL,
            started_at = NULL,
            completed_at = NULL,
            last_error = NULL,
            updated_at = now()
          WHERE id = $1
        `,
        [jobId],
      );

      await client.query(
        `
          INSERT INTO job_status_history (
            job_id,
            from_status,
            to_status,
            reason,
            actor,
            changed_at
          )
          VALUES ($1, $2, $3, $4, $5, now())
        `,
        [jobId, 'failed_processing', 'queued', retryReason, 'api'],
      );

      await client.query('COMMIT');

      return {
        jobId,
        status: 'queued',
        message: 'Job re-queued for processing retry.',
      };
    }

    if (currentJob.status === 'failed_delivery') {
      const rearmedAttempts = await client.query<{ id: number }>(
        `
          UPDATE delivery_attempts
          SET
            status = 'failed_retryable',
            next_retry_at = now()
          WHERE job_id = $1
            AND status = 'failed_final'
          RETURNING id
        `,
        [jobId],
      );

      if (rearmedAttempts.rowCount === 0) {
        throw new JobsRepositoryError(
          409,
          'JOB_NOT_RETRYABLE',
          'This failed delivery job has no final delivery attempts to retry.',
        );
      }

      await client.query(
        `
          UPDATE jobs
          SET
            status = 'processed',
            completed_at = NULL,
            last_error = NULL,
            updated_at = now()
          WHERE id = $1
        `,
        [jobId],
      );

      await client.query(
        `
          INSERT INTO job_status_history (
            job_id,
            from_status,
            to_status,
            reason,
            actor,
            changed_at
          )
          VALUES ($1, $2, $3, $4, $5, now())
        `,
        [jobId, 'failed_delivery', 'processed', retryReason, 'api'],
      );

      await client.query('COMMIT');

      return {
        jobId,
        status: 'processed',
        message: `Delivery retry scheduled for ${rearmedAttempts.rowCount} attempt(s).`,
      };
    }

    throw new JobsRepositoryError(
      409,
      'JOB_NOT_RETRYABLE',
      'Only failed jobs can be retried.',
      { status: currentJob.status },
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
