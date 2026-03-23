import { pool } from '../../db/pool';
import { ListLogsQuery } from './logs.types';

type TimestampValue = string | Date;

type LogRow = {
  id: number;
  timestamp: TimestampValue;
  level: 'info' | 'warn' | 'error';
  source: 'api' | 'worker' | 'delivery' | 'system';
  message: string;
  job_id: string | null;
  pipeline_id: string | null;
  correlation_id: string | null;
};

const LOG_FILTER_SQL = {
  level: 'level',
  source: 'source',
  jobId: 'job_id',
  pipelineId: 'pipeline_id',
} as const;

export type LogListItem = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  source: 'api' | 'worker' | 'delivery' | 'system';
  message: string;
  jobId: string | null;
  pipelineId: string | null;
  correlationId: string | null;
};

function toIsoString(value: TimestampValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapLogRow(row: LogRow): LogListItem {
  return {
    id: String(row.id),
    timestamp: toIsoString(row.timestamp),
    level: row.level,
    source: row.source,
    message: row.message,
    jobId: row.job_id,
    pipelineId: row.pipeline_id,
    correlationId: row.correlation_id,
  };
}

export async function getLogs(filters: ListLogsQuery): Promise<LogListItem[]> {
  const whereClauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.level) {
    values.push(filters.level);
    // The column name comes from a strict allowlist, never directly from request input.
    whereClauses.push(`${LOG_FILTER_SQL.level} = $${values.length}`);
  }

  if (filters.source) {
    values.push(filters.source);
    whereClauses.push(`${LOG_FILTER_SQL.source} = $${values.length}`);
  }

  if (filters.jobId) {
    values.push(filters.jobId);
    whereClauses.push(`${LOG_FILTER_SQL.jobId} = $${values.length}`);
  }

  if (filters.pipelineId) {
    values.push(filters.pipelineId);
    whereClauses.push(`${LOG_FILTER_SQL.pipelineId} = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const searchParam = `$${values.length}`;
    whereClauses.push(`
      (
        message ILIKE ${searchParam}
        OR COALESCE(correlation_id, '') ILIKE ${searchParam}
        OR COALESCE(job_id::text, '') ILIKE ${searchParam}
        OR COALESCE(pipeline_id::text, '') ILIKE ${searchParam}
      )
    `);
  }

  values.push(filters.limit);
  const limitParam = `$${values.length}`;
  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const query = `
    SELECT
      id,
      timestamp,
      level,
      source,
      message,
      job_id,
      pipeline_id,
      correlation_id
    FROM logs
    ${whereSql}
    ORDER BY timestamp DESC, id DESC
    LIMIT ${limitParam}
  `;

  const result = await pool.query<LogRow>(query, values);
  return result.rows.map(mapLogRow);
}
