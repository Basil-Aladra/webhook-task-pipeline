-- Persist structured application logs for observability and dashboard queries.
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  source TEXT NOT NULL CHECK (source IN ('api', 'worker', 'delivery', 'system')),
  message TEXT NOT NULL,
  job_id UUID,
  pipeline_id UUID,
  correlation_id TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp_desc
  ON logs (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_level_source_timestamp
  ON logs (level, source, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_job_id_timestamp
  ON logs (job_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_logs_pipeline_id_timestamp
  ON logs (pipeline_id, timestamp DESC);
