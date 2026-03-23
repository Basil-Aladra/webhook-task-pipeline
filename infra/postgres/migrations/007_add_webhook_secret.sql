-- Adds optional per-pipeline webhook secret for signature verification.
ALTER TABLE pipelines
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT NULL;

