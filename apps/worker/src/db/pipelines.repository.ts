import { Pool, PoolClient } from 'pg';

import { pool } from './pool';

type Queryable = Pool | PoolClient;
type TimestampValue = string | Date;

type PipelineRow = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhook_path: string;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type PipelineActionRow = {
  id: string;
  pipeline_id: string;
  order_index: number;
  action_type: 'validate' | 'transform' | 'enrich' | 'filter';
  config: Record<string, unknown>;
  enabled: boolean;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type PipelineSubscriberRow = {
  id: string;
  pipeline_id: string;
  target_url: string;
  enabled: boolean;
  timeout_ms: number;
  max_retries: number;
  retry_backoff_ms: number;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

export type PipelineAction = {
  id: string;
  pipelineId: string;
  orderIndex: number;
  actionType: 'validate' | 'transform' | 'enrich' | 'filter';
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PipelineSubscriber = {
  id: string;
  pipelineId: string;
  targetUrl: string;
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  createdAt: string;
  updatedAt: string;
};

export type Pipeline = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhookPath: string;
  createdAt: string;
  updatedAt: string;
};

export type PipelineWithActions = {
  pipeline: Pipeline;
  actions: PipelineAction[];
};

function toIsoString(value: TimestampValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

// Fetches one pipeline and all its actions ordered by order_index.
export async function getPipelineWithActions(
  pipelineId: string,
  db: Queryable = pool,
): Promise<PipelineWithActions | null> {
  const pipelineQuery = `
    SELECT id, name, status, webhook_path, created_at, updated_at
    FROM pipelines
    WHERE id = $1
  `;

  const pipelineResult = await db.query<PipelineRow>(pipelineQuery, [pipelineId]);

  if (pipelineResult.rowCount === 0) {
    return null;
  }

  const actionsQuery = `
    SELECT
      id,
      pipeline_id,
      order_index,
      action_type,
      config,
      enabled,
      created_at,
      updated_at
    FROM pipeline_actions
    WHERE pipeline_id = $1
    ORDER BY order_index ASC
  `;

  const actionsResult = await db.query<PipelineActionRow>(actionsQuery, [pipelineId]);

  const pipeline = pipelineResult.rows[0];

  return {
    pipeline: {
      id: pipeline.id,
      name: pipeline.name,
      status: pipeline.status,
      webhookPath: pipeline.webhook_path,
      createdAt: toIsoString(pipeline.created_at),
      updatedAt: toIsoString(pipeline.updated_at),
    },
    actions: actionsResult.rows.map((action) => ({
      id: action.id,
      pipelineId: action.pipeline_id,
      orderIndex: action.order_index,
      actionType: action.action_type,
      config: action.config,
      enabled: action.enabled,
      createdAt: toIsoString(action.created_at),
      updatedAt: toIsoString(action.updated_at),
    })),
  };
}

// Fetches all subscribers for a pipeline.
export async function getPipelineSubscribers(
  pipelineId: string,
  db: Queryable = pool,
): Promise<PipelineSubscriber[]> {
  const query = `
    SELECT
      id,
      pipeline_id,
      target_url,
      enabled,
      timeout_ms,
      max_retries,
      retry_backoff_ms,
      created_at,
      updated_at
    FROM pipeline_subscribers
    WHERE pipeline_id = $1
    ORDER BY created_at ASC
  `;

  const result = await db.query<PipelineSubscriberRow>(query, [pipelineId]);

  return result.rows.map((subscriber) => ({
    id: subscriber.id,
    pipelineId: subscriber.pipeline_id,
    targetUrl: subscriber.target_url,
    enabled: subscriber.enabled,
    timeoutMs: subscriber.timeout_ms,
    maxRetries: subscriber.max_retries,
    retryBackoffMs: subscriber.retry_backoff_ms,
    createdAt: toIsoString(subscriber.created_at),
    updatedAt: toIsoString(subscriber.updated_at),
  }));
}

// Fetches one subscriber endpoint and retry configuration by its row id.
export async function getSubscriberById(
  subscriberId: string,
  db: Queryable = pool,
): Promise<PipelineSubscriber | null> {
  const query = `
    SELECT
      id,
      pipeline_id,
      target_url,
      enabled,
      timeout_ms,
      max_retries,
      retry_backoff_ms,
      created_at,
      updated_at
    FROM pipeline_subscribers
    WHERE id = $1
    LIMIT 1
  `;

  const result = await db.query<PipelineSubscriberRow>(query, [subscriberId]);
  if (result.rowCount === 0) {
    return null;
  }

  const subscriber = result.rows[0];
  return {
    id: subscriber.id,
    pipelineId: subscriber.pipeline_id,
    targetUrl: subscriber.target_url,
    enabled: subscriber.enabled,
    timeoutMs: subscriber.timeout_ms,
    maxRetries: subscriber.max_retries,
    retryBackoffMs: subscriber.retry_backoff_ms,
    createdAt: toIsoString(subscriber.created_at),
    updatedAt: toIsoString(subscriber.updated_at),
  };
}
