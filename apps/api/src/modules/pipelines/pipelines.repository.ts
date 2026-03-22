import { Pool, PoolClient } from 'pg';

import { pool } from '../../db/pool';
import {
  CreatePipelineAction,
  CreatePipelineRequest,
  CreatePipelineSubscriber,
  ListPipelinesQuery,
  UpdatePipelineRequest,
} from './pipelines.types';

type Queryable = Pool | PoolClient;
type TimestampValue = string | Date;

type PipelineRow = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhook_path: string;
  description: string | null;
  created_at: TimestampValue;
  updated_at: TimestampValue;
};

type PipelineActionRow = {
  id: string;
  pipeline_id: string;
  order_index: number;
  action_type: 'transform' | 'enrich' | 'filter';
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

type PipelineListRow = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhook_path: string;
  description: string | null;
  created_at: TimestampValue;
  updated_at: TimestampValue;
  actions_count: number;
  subscribers_count: number;
};

type CountRow = {
  total: number;
};

export type PipelineWithRelations = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhookPath: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  actions: Array<{
    id: string;
    pipelineId: string;
    orderIndex: number;
    actionType: 'transform' | 'enrich' | 'filter';
    config: Record<string, unknown>;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  subscribers: Array<{
    id: string;
    pipelineId: string;
    targetUrl: string;
    enabled: boolean;
    timeoutMs: number;
    maxRetries: number;
    retryBackoffMs: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

export type PipelineListItem = {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  webhookPath: string;
  description: string | null;
  actionsCount: number;
  subscribersCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedPipelines = {
  items: PipelineListItem[];
  total: number;
};

function toIsoString(value: TimestampValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapPipelineRow(row: PipelineRow): Omit<PipelineWithRelations, 'actions' | 'subscribers'> {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    webhookPath: row.webhook_path,
    description: row.description,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapPipelineActionRow(row: PipelineActionRow): PipelineWithRelations['actions'][number] {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    orderIndex: row.order_index,
    actionType: row.action_type,
    config: row.config,
    enabled: row.enabled,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapPipelineSubscriberRow(
  row: PipelineSubscriberRow,
): PipelineWithRelations['subscribers'][number] {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    targetUrl: row.target_url,
    enabled: row.enabled,
    timeoutMs: row.timeout_ms,
    maxRetries: row.max_retries,
    retryBackoffMs: row.retry_backoff_ms,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapPipelineListRow(row: PipelineListRow): PipelineListItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    webhookPath: row.webhook_path,
    description: row.description,
    actionsCount: row.actions_count,
    subscribersCount: row.subscribers_count,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

// Inserts a new pipeline row.
export async function createPipeline(
  client: PoolClient,
  data: Pick<CreatePipelineRequest, 'name' | 'status' | 'webhookPath' | 'description'>,
): Promise<PipelineRow> {
  const query = `
    INSERT INTO pipelines (name, status, webhook_path, description)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, status, webhook_path, description, created_at, updated_at
  `;

  const values = [data.name, data.status, data.webhookPath, data.description ?? null];
  const result = await client.query<PipelineRow>(query, values);
  return result.rows[0];
}

// Inserts actions linked to a pipeline.
export async function createPipelineActions(
  client: PoolClient,
  pipelineId: string,
  actions: CreatePipelineAction[] = [],
): Promise<PipelineActionRow[]> {
  const insertedRows: PipelineActionRow[] = [];

  for (const action of actions) {
    const query = `
      INSERT INTO pipeline_actions (pipeline_id, order_index, action_type, config, enabled)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, pipeline_id, order_index, action_type, config, enabled, created_at, updated_at
    `;

    const values = [pipelineId, action.orderIndex, action.actionType, action.config, action.enabled];
    const result = await client.query<PipelineActionRow>(query, values);
    insertedRows.push(result.rows[0]);
  }

  return insertedRows;
}

// Inserts subscribers linked to a pipeline.
export async function createPipelineSubscribers(
  client: PoolClient,
  pipelineId: string,
  subscribers: CreatePipelineSubscriber[] = [],
): Promise<PipelineSubscriberRow[]> {
  const insertedRows: PipelineSubscriberRow[] = [];

  for (const subscriber of subscribers) {
    const query = `
      INSERT INTO pipeline_subscribers (
        pipeline_id,
        target_url,
        enabled,
        timeout_ms,
        max_retries,
        retry_backoff_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        pipeline_id,
        target_url,
        enabled,
        timeout_ms,
        max_retries,
        retry_backoff_ms,
        created_at,
        updated_at
    `;

    const values = [
      pipelineId,
      subscriber.targetUrl,
      subscriber.enabled,
      subscriber.timeoutMs,
      subscriber.maxRetries,
      subscriber.retryBackoffMs,
    ];

    const result = await client.query<PipelineSubscriberRow>(query, values);
    insertedRows.push(result.rows[0]);
  }

  return insertedRows;
}

// Fetches one pipeline and includes full actions and subscribers arrays.
export async function getPipelineById(
  pipelineId: string,
  db: Queryable = pool,
): Promise<PipelineWithRelations | null> {
  const pipelineQuery = `
    SELECT id, name, status, webhook_path, description, created_at, updated_at
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

  const subscribersQuery = `
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

  const [actionsResult, subscribersResult] = await Promise.all([
    db.query<PipelineActionRow>(actionsQuery, [pipelineId]),
    db.query<PipelineSubscriberRow>(subscribersQuery, [pipelineId]),
  ]);

  return {
    ...mapPipelineRow(pipelineResult.rows[0]),
    actions: actionsResult.rows.map(mapPipelineActionRow),
    subscribers: subscribersResult.rows.map(mapPipelineSubscriberRow),
  };
}

// Lists pipelines with optional status filter and pagination.
// Returns only summary fields plus actions/subscribers counts.
export async function getAllPipelines(
  filters: ListPipelinesQuery,
  db: Queryable = pool,
): Promise<PaginatedPipelines> {
  const whereClauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.status) {
    values.push(filters.status);
    whereClauses.push(`p.status = $${values.length}`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const offset = (filters.page - 1) * filters.limit;

  values.push(filters.limit);
  const limitParam = values.length;
  values.push(offset);
  const offsetParam = values.length;

  const listQuery = `
    SELECT
      p.id,
      p.name,
      p.status,
      p.webhook_path,
      p.description,
      p.created_at,
      p.updated_at,
      COALESCE(pa.actions_count, 0)::int AS actions_count,
      COALESCE(ps.subscribers_count, 0)::int AS subscribers_count
    FROM pipelines p
    LEFT JOIN (
      SELECT pipeline_id, COUNT(*)::int AS actions_count
      FROM pipeline_actions
      GROUP BY pipeline_id
    ) pa ON pa.pipeline_id = p.id
    LEFT JOIN (
      SELECT pipeline_id, COUNT(*)::int AS subscribers_count
      FROM pipeline_subscribers
      GROUP BY pipeline_id
    ) ps ON ps.pipeline_id = p.id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const countValues: Array<string | number> = [];
  let countWhereSql = '';

  if (filters.status) {
    countValues.push(filters.status);
    countWhereSql = `WHERE status = $${countValues.length}`;
  }

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM pipelines
    ${countWhereSql}
  `;

  const [listResult, countResult] = await Promise.all([
    db.query<PipelineListRow>(listQuery, values),
    db.query<CountRow>(countQuery, countValues),
  ]);

  return {
    items: listResult.rows.map(mapPipelineListRow),
    total: countResult.rows[0]?.total ?? 0,
  };
}

// Updates only provided pipeline fields and returns the full updated pipeline.
export async function updatePipeline(
  pipelineId: string,
  data: UpdatePipelineRequest,
  db: Queryable = pool,
): Promise<PipelineWithRelations | null> {
  const setClauses: string[] = [];
  const values: Array<string | null> = [];

  if (data.name !== undefined) {
    values.push(data.name);
    setClauses.push(`name = $${values.length}`);
  }

  if (data.description !== undefined) {
    values.push(data.description);
    setClauses.push(`description = $${values.length}`);
  }

  if (data.status !== undefined) {
    values.push(data.status);
    setClauses.push(`status = $${values.length}`);
  }

  if (data.webhookPath !== undefined) {
    values.push(data.webhookPath);
    setClauses.push(`webhook_path = $${values.length}`);
  }

  // Fallback for internal use in case callers bypass validation.
  if (setClauses.length === 0) {
    return getPipelineById(pipelineId, db);
  }

  values.push(pipelineId);

  const updateQuery = `
    UPDATE pipelines
    SET
      ${setClauses.join(', ')},
      updated_at = now()
    WHERE id = $${values.length}
    RETURNING id
  `;

  const updateResult = await db.query<{ id: string }>(updateQuery, values);

  if (updateResult.rowCount === 0) {
    return null;
  }

  return getPipelineById(pipelineId, db);
}

// Replaces all actions for a pipeline.
// Intended to be called inside a transaction.
export async function replacePipelineActions(
  client: PoolClient,
  pipelineId: string,
  actions: CreatePipelineAction[],
): Promise<PipelineActionRow[]> {
  await client.query('DELETE FROM pipeline_actions WHERE pipeline_id = $1', [pipelineId]);
  return createPipelineActions(client, pipelineId, actions);
}

// Replaces all subscribers for a pipeline.
// Intended to be called inside a transaction.
export async function replacePipelineSubscribers(
  client: PoolClient,
  pipelineId: string,
  subscribers: CreatePipelineSubscriber[],
): Promise<PipelineSubscriberRow[]> {
  await client.query('DELETE FROM pipeline_subscribers WHERE pipeline_id = $1', [pipelineId]);
  return createPipelineSubscribers(client, pipelineId, subscribers);
}

// Soft-deletes a pipeline by archiving it.
export async function archivePipeline(
  pipelineId: string,
  db: Queryable = pool,
): Promise<PipelineWithRelations | null> {
  const archiveQuery = `
    UPDATE pipelines
    SET status = 'archived', updated_at = now()
    WHERE id = $1
    RETURNING id
  `;

  const archiveResult = await db.query<{ id: string }>(archiveQuery, [pipelineId]);

  if (archiveResult.rowCount === 0) {
    return null;
  }

  return getPipelineById(pipelineId, db);
}
