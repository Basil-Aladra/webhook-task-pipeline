-- 010_add_validate_action_type.sql
-- Extends pipeline action types with a lightweight validation processor.

ALTER TABLE pipeline_actions
  DROP CONSTRAINT IF EXISTS pipeline_actions_action_type_check;

ALTER TABLE pipeline_actions
  ADD CONSTRAINT pipeline_actions_action_type_check
  CHECK (action_type IN ('validate', 'transform', 'enrich', 'filter'));
