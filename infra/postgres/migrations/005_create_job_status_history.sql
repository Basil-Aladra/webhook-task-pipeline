-- 005_create_job_status_history.sql
-- Records status transitions for each job.

CREATE TABLE IF NOT EXISTS job_status_history (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for timeline queries per job.
CREATE INDEX IF NOT EXISTS job_status_history_job_id_changed_at_idx
  ON job_status_history (job_id, changed_at);
