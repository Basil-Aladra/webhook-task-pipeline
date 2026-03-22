-- 003_create_pipeline_subscribers.sql
-- Stores subscriber endpoints and retry configuration per pipeline.

CREATE TABLE IF NOT EXISTS pipeline_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  target_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  timeout_ms INT NOT NULL DEFAULT 5000,
  max_retries INT NOT NULL DEFAULT 3,
  retry_backoff_ms INT NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
