-- 001_demo_pipeline.sql
-- Seeds one demo pipeline with two actions and one subscriber.

BEGIN;

WITH upserted_pipeline AS (
  INSERT INTO pipelines (name, status, webhook_path, description)
  VALUES (
    'Demo Orders Pipeline',
    'active',
    'demo-orders',
    'Demo pipeline for order webhook processing'
  )
  ON CONFLICT (webhook_path)
  DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    updated_at = now()
  RETURNING id
)
DELETE FROM pipeline_actions
WHERE pipeline_id = (SELECT id FROM upserted_pipeline);

WITH selected_pipeline AS (
  SELECT id FROM pipelines WHERE webhook_path = 'demo-orders'
)
INSERT INTO pipeline_actions (pipeline_id, order_index, action_type, config, enabled)
VALUES
  (
    (SELECT id FROM selected_pipeline),
    1,
    'validate',
    '{}'::jsonb,
    true
  ),
  (
    (SELECT id FROM selected_pipeline),
    2,
    'transform',
    '{"rename": {"orderId": "id"}}'::jsonb,
    true
  ),
  (
    (SELECT id FROM selected_pipeline),
    3,
    'enrich',
    '{"add": {"source": "demo-seed"}}'::jsonb,
    true
  );

WITH selected_pipeline AS (
  SELECT id FROM pipelines WHERE webhook_path = 'demo-orders'
)
DELETE FROM pipeline_subscribers
WHERE pipeline_id = (SELECT id FROM selected_pipeline);

WITH selected_pipeline AS (
  SELECT id FROM pipelines WHERE webhook_path = 'demo-orders'
)
INSERT INTO pipeline_subscribers (
  pipeline_id,
  target_url,
  enabled,
  timeout_ms,
  max_retries,
  retry_backoff_ms
)
VALUES (
  (SELECT id FROM selected_pipeline),
  'http://localhost:3000/api/v1/demo/subscribers/success',
  true,
  5000,
  3,
  2000
);

COMMIT;
