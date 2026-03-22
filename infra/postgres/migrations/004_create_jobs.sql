-- 004_create_jobs.sql
-- Creates the jobs table used as the ingestion queue and execution state tracker.

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (
      status IN (
        'queued',
        'processing',
        'processed',
        'completed',
        'failed_processing',
        'failed_delivery'
      )
    ),
  payload JSONB NOT NULL,
  idempotency_key TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lock_expires_at TIMESTAMPTZ,
  processing_attempt_count INT NOT NULL DEFAULT 0,
  result_payload JSONB,
  last_error JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index for idempotency per pipeline.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_pipeline_idempotency_key_uq
  ON jobs (pipeline_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Queue lookup index for worker polling.
CREATE INDEX IF NOT EXISTS jobs_status_available_at_idx
  ON jobs (status, available_at);

-- Common index for listing/filtering jobs by pipeline.
CREATE INDEX IF NOT EXISTS jobs_pipeline_id_created_at_idx
  ON jobs (pipeline_id, created_at);
