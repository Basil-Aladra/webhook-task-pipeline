-- 002_create_pipeline_actions.sql
-- Stores ordered action configuration for each pipeline.

CREATE TABLE IF NOT EXISTS pipeline_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id),
  order_index INT NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('transform', 'enrich', 'filter')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, order_index)
);
