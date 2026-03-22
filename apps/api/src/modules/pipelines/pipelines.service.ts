import { pool } from '../../db/pool';
import {
  archivePipeline,
  createPipeline as createPipelineRecord,
  createPipelineActions,
  createPipelineSubscribers,
  getAllPipelines as getAllPipelinesRecords,
  getPipelineById as getPipelineByIdRecord,
  PaginatedPipelines,
  PipelineWithRelations,
  replacePipelineActions as replacePipelineActionsRecord,
  replacePipelineSubscribers as replacePipelineSubscribersRecord,
  updatePipeline as updatePipelineRecord,
} from './pipelines.repository';
import {
  CreatePipelineAction,
  CreatePipelineRequest,
  CreatePipelineSubscriber,
  ListPipelinesQuery,
  UpdatePipelineRequest,
} from './pipelines.types';

const WEBHOOK_PATH_UNIQUE_CONSTRAINT = 'pipelines_webhook_path_key';

export class DuplicateWebhookPathError extends Error {
  constructor() {
    super('A pipeline with this webhookPath already exists.');
    this.name = 'DuplicateWebhookPathError';
  }
}

export class PipelineNotFoundError extends Error {
  constructor() {
    super('Pipeline not found.');
    this.name = 'PipelineNotFoundError';
  }
}

type PostgresErrorLike = {
  code?: string;
  constraint?: string;
};

function isDuplicateWebhookPathError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const pgError = error as PostgresErrorLike;
  return pgError.code === '23505' && pgError.constraint === WEBHOOK_PATH_UNIQUE_CONSTRAINT;
}

// Creates a pipeline and optional nested actions/subscribers in one transaction.
export async function createPipeline(data: CreatePipelineRequest): Promise<PipelineWithRelations> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pipeline = await createPipelineRecord(client, {
      name: data.name,
      status: data.status,
      webhookPath: data.webhookPath,
      description: data.description,
    });

    if (data.actions && data.actions.length > 0) {
      await createPipelineActions(client, pipeline.id, data.actions);
    }

    if (data.subscribers && data.subscribers.length > 0) {
      await createPipelineSubscribers(client, pipeline.id, data.subscribers);
    }

    const created = await getPipelineByIdRecord(pipeline.id, client);

    if (!created) {
      throw new Error('Failed to load pipeline after creation.');
    }

    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');

    if (isDuplicateWebhookPathError(error)) {
      throw new DuplicateWebhookPathError();
    }

    throw error;
  } finally {
    client.release();
  }
}

// Lists pipelines with optional status filter and pagination.
export async function getAllPipelines(filters: ListPipelinesQuery): Promise<PaginatedPipelines> {
  return getAllPipelinesRecords(filters);
}

// Gets one pipeline by ID or throws a not-found error.
export async function getPipelineById(pipelineId: string): Promise<PipelineWithRelations> {
  const pipeline = await getPipelineByIdRecord(pipelineId);

  if (!pipeline) {
    throw new PipelineNotFoundError();
  }

  return pipeline;
}

// Partially updates a pipeline and handles webhookPath conflict.
export async function updatePipeline(
  pipelineId: string,
  data: UpdatePipelineRequest,
): Promise<PipelineWithRelations> {
  try {
    const updated = await updatePipelineRecord(pipelineId, data);

    if (!updated) {
      throw new PipelineNotFoundError();
    }

    return updated;
  } catch (error) {
    if (isDuplicateWebhookPathError(error)) {
      throw new DuplicateWebhookPathError();
    }

    throw error;
  }
}

// Replaces all actions for a pipeline inside a transaction.
export async function replacePipelineActions(
  pipelineId: string,
  actions: CreatePipelineAction[],
): Promise<PipelineWithRelations> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPipelineByIdRecord(pipelineId, client);

    if (!existing) {
      throw new PipelineNotFoundError();
    }

    await replacePipelineActionsRecord(client, pipelineId, actions);

    const updated = await getPipelineByIdRecord(pipelineId, client);

    if (!updated) {
      throw new Error('Failed to load pipeline after replacing actions.');
    }

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Replaces all subscribers for a pipeline inside a transaction.
export async function replacePipelineSubscribers(
  pipelineId: string,
  subscribers: CreatePipelineSubscriber[],
): Promise<PipelineWithRelations> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await getPipelineByIdRecord(pipelineId, client);

    if (!existing) {
      throw new PipelineNotFoundError();
    }

    await replacePipelineSubscribersRecord(client, pipelineId, subscribers);

    const updated = await getPipelineByIdRecord(pipelineId, client);

    if (!updated) {
      throw new Error('Failed to load pipeline after replacing subscribers.');
    }

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Soft-deletes a pipeline by archiving it.
export async function deletePipeline(pipelineId: string): Promise<PipelineWithRelations> {
  const archived = await archivePipeline(pipelineId);

  if (!archived) {
    throw new PipelineNotFoundError();
  }

  return archived;
}
