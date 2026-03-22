-- 006_create_delivery_attempts.sql
-- Tracks each outbound delivery attempt and retry schedule.

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  subscriber_id UUID NOT NULL REFERENCES pipeline_subscribers(id),
  attempt_no INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (
      status IN (
        'scheduled',
        'in_progress',
        'succeeded',
        'failed_retryable',
        'failed_final'
      )
    ),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  request_payload JSONB,
  response_status_code INT,
  response_body TEXT,
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, subscriber_id, attempt_no)
);

-- Index for job delivery status and retry scheduling.
CREATE INDEX IF NOT EXISTS delivery_attempts_job_id_status_next_retry_at_idx
  ON delivery_attempts (job_id, status, next_retry_at);
