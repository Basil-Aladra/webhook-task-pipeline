import { Pool, PoolClient } from 'pg';

import { pool } from '../../db/pool';

type Queryable = Pool | PoolClient;
type TimestampValue = string | Date;

type DeliveryAttemptStatus =
  | 'scheduled'
  | 'in_progress'
  | 'succeeded'
  | 'failed_retryable'
  | 'failed_final';

type DeliveryAttemptRow = {
  id: number;
  job_id: string;
  subscriber_id: string;
  attempt_no: number;
  status: DeliveryAttemptStatus;
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
  count: string;
};

const DELIVERY_UPDATE_COLUMN_SQL = {
  status: 'status',
  startedAt: 'started_at',
  finishedAt: 'finished_at',
  requestPayload: 'request_payload',
  responseStatusCode: 'response_status_code',
  responseBody: 'response_body',
  errorMessage: 'error_message',
  durationMs: 'duration_ms',
  nextRetryAt: 'next_retry_at',
} as const;

export type DeliveryAttempt = {
  id: number;
  jobId: string;
  subscriberId: string;
  attemptNo: number;
  status: DeliveryAttemptStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  requestPayload: Record<string, unknown> | null;
  responseStatusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type CreateDeliveryAttemptInput = {
  jobId: string;
  subscriberId: string;
  attemptNo: number;
};

export type UpdateDeliveryAttemptInput = {
  status?: DeliveryAttemptStatus;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  requestPayload?: Record<string, unknown> | null;
  responseStatusCode?: number | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  nextRetryAt?: string | Date | null;
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

function toDbDate(value: string | Date | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapDeliveryAttempt(row: DeliveryAttemptRow): DeliveryAttempt {
  return {
    id: row.id,
    jobId: row.job_id,
    subscriberId: row.subscriber_id,
    attemptNo: row.attempt_no,
    status: row.status,
    scheduledAt: toIsoString(row.scheduled_at) ?? new Date().toISOString(),
    startedAt: toIsoString(row.started_at),
    finishedAt: toIsoString(row.finished_at),
    requestPayload: row.request_payload,
    responseStatusCode: row.response_status_code,
    responseBody: row.response_body,
    errorMessage: row.error_message,
    nextRetryAt: toIsoString(row.next_retry_at),
    durationMs: row.duration_ms,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

// Creates a new delivery attempt row in "scheduled" status.
export async function createDeliveryAttempt(
  data: CreateDeliveryAttemptInput,
  db: Queryable = pool,
): Promise<DeliveryAttempt> {
  const query = `
    INSERT INTO delivery_attempts (
      job_id,
      subscriber_id,
      attempt_no,
      status,
      scheduled_at
    )
    VALUES ($1, $2, $3, 'scheduled', now())
    RETURNING
      id,
      job_id,
      subscriber_id,
      attempt_no,
      status,
      scheduled_at,
      started_at,
      finished_at,
      request_payload,
      response_status_code,
      response_body,
      error_message,
      next_retry_at,
      duration_ms,
      created_at
  `;

  const result = await db.query<DeliveryAttemptRow>(query, [
    data.jobId,
    data.subscriberId,
    data.attemptNo,
  ]);

  return mapDeliveryAttempt(result.rows[0]);
}

// Updates a delivery attempt and returns the updated row.
export async function updateDeliveryAttempt(
  attemptId: number,
  data: UpdateDeliveryAttemptInput,
  db: Queryable = pool,
): Promise<DeliveryAttempt> {
  const setClauses: string[] = [];
  const values: Array<string | number | Record<string, unknown> | null> = [];

  if (data.status !== undefined) {
    values.push(data.status);
    // Column names come from a fixed allowlist rather than arbitrary keys.
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.status} = $${values.length}`);
  }

  if (data.startedAt !== undefined) {
    values.push(toDbDate(data.startedAt));
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.startedAt} = $${values.length}`);
  }

  if (data.finishedAt !== undefined) {
    values.push(toDbDate(data.finishedAt));
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.finishedAt} = $${values.length}`);
  }

  if (data.requestPayload !== undefined) {
    values.push(data.requestPayload);
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.requestPayload} = $${values.length}`);
  }

  if (data.responseStatusCode !== undefined) {
    values.push(data.responseStatusCode);
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.responseStatusCode} = $${values.length}`);
  }

  if (data.responseBody !== undefined) {
    values.push(data.responseBody);
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.responseBody} = $${values.length}`);
  }

  if (data.errorMessage !== undefined) {
    values.push(data.errorMessage);
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.errorMessage} = $${values.length}`);
  }

  if (data.durationMs !== undefined) {
    values.push(data.durationMs);
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.durationMs} = $${values.length}`);
  }

  if (data.nextRetryAt !== undefined) {
    values.push(toDbDate(data.nextRetryAt));
    setClauses.push(`${DELIVERY_UPDATE_COLUMN_SQL.nextRetryAt} = $${values.length}`);
  }

  if (setClauses.length === 0) {
    const unchangedQuery = `
      SELECT
        id,
        job_id,
        subscriber_id,
        attempt_no,
        status,
        scheduled_at,
        started_at,
        finished_at,
        request_payload,
        response_status_code,
        response_body,
        error_message,
        next_retry_at,
        duration_ms,
        created_at
      FROM delivery_attempts
      WHERE id = $1
    `;

    const unchangedResult = await db.query<DeliveryAttemptRow>(unchangedQuery, [attemptId]);
    return mapDeliveryAttempt(unchangedResult.rows[0]);
  }

  values.push(attemptId);

  const query = `
    UPDATE delivery_attempts
    SET ${setClauses.join(', ')}
    WHERE id = $${values.length}
    RETURNING
      id,
      job_id,
      subscriber_id,
      attempt_no,
      status,
      scheduled_at,
      started_at,
      finished_at,
      request_payload,
      response_status_code,
      response_body,
      error_message,
      next_retry_at,
      duration_ms,
      created_at
  `;

  const result = await db.query<DeliveryAttemptRow>(query, values);
  return mapDeliveryAttempt(result.rows[0]);
}

// Returns current number of attempts for one (job, subscriber) pair.
export async function getDeliveryAttemptCount(
  jobId: string,
  subscriberId: string,
  db: Queryable = pool,
): Promise<number> {
  const query = `
    SELECT COUNT(*)::text AS count
    FROM delivery_attempts
    WHERE job_id = $1 AND subscriber_id = $2
  `;

  const result = await db.query<CountRow>(query, [jobId, subscriberId]);
  return Number(result.rows[0]?.count ?? '0');
}

// Returns pending delivery attempts for a job.
export async function getPendingDeliveries(
  jobId: string,
  db: Queryable = pool,
): Promise<DeliveryAttempt[]> {
  const query = `
    SELECT
      id,
      job_id,
      subscriber_id,
      attempt_no,
      status,
      scheduled_at,
      started_at,
      finished_at,
      request_payload,
      response_status_code,
      response_body,
      error_message,
      next_retry_at,
      duration_ms,
      created_at
    FROM delivery_attempts
    WHERE job_id = $1
      AND status IN ('scheduled', 'failed_retryable')
      AND (next_retry_at <= now() OR next_retry_at IS NULL)
    ORDER BY scheduled_at ASC
  `;

  const result = await db.query<DeliveryAttemptRow>(query, [jobId]);
  return result.rows.map(mapDeliveryAttempt);
}

export type ClaimedRetryableDeliveryAttempt = {
  attemptId: number;
  jobId: string;
  subscriberId: string;
  attemptNo: number;
};

// Claims (atomically) one due retryable delivery attempt so only one worker retries it.
// We clear `next_retry_at` as a lightweight "claim marker" so other workers won't pick it up again.
export async function claimNextRetryableDeliveryAttempt(
  db: Queryable = pool,
): Promise<ClaimedRetryableDeliveryAttempt | null> {
  const query = `
    UPDATE delivery_attempts
    SET next_retry_at = NULL
    WHERE id = (
      SELECT id
      FROM delivery_attempts
      WHERE status = 'failed_retryable'
        AND next_retry_at <= now()
      ORDER BY next_retry_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, job_id, subscriber_id, attempt_no
  `;

  const result = await db.query<{ id: number; job_id: string; subscriber_id: string; attempt_no: number }>(query);

  if (result.rowCount === 0) {
    return null;
  }

  return {
    attemptId: result.rows[0].id,
    jobId: result.rows[0].job_id,
    subscriberId: result.rows[0].subscriber_id,
    attemptNo: result.rows[0].attempt_no,
  };
}
