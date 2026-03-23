import assert from 'node:assert/strict';

process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/webhook_pipeline';

const { recoverExpiredProcessingJobs } = require('./jobs.repository') as typeof import('./jobs.repository');
const { pool } = require('../../db/pool') as typeof import('../../db/pool');

type QueryResultRow = Record<string, unknown>;
type MockQueryResult<T extends QueryResultRow = QueryResultRow> = {
  rowCount: number;
  rows: T[];
};

class MockDb {
  public readonly calls: Array<{ text: string; params: unknown[] }> = [];
  private readonly queuedResults: MockQueryResult[];

  constructor(results: MockQueryResult[]) {
    this.queuedResults = [...results];
  }

  async query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<MockQueryResult<T>> {
    this.calls.push({ text, params });

    if (this.queuedResults.length === 0) {
      throw new Error('Unexpected query call in test.');
    }

    return this.queuedResults.shift() as MockQueryResult<T>;
  }
}

async function testRequeuesExpiredJobs(): Promise<void> {
  const db = new MockDb([
    {
      rowCount: 2,
      rows: [{ id: 'job-1' }, { id: 'job-2' }],
    },
    { rowCount: 1, rows: [] },
    { rowCount: 1, rows: [] },
  ]);

  const recoveredJobIds = await recoverExpiredProcessingJobs(db as never);

  assert.deepEqual(recoveredJobIds, ['job-1', 'job-2']);
  assert.equal(db.calls.length, 3);

  const recoveryQuery = db.calls[0];
  assert.match(recoveryQuery.text, /WITH expired_jobs AS/i);
  assert.match(recoveryQuery.text, /status = \$2/i);
  assert.match(recoveryQuery.text, /locked_at = NULL/i);
  assert.match(recoveryQuery.text, /locked_by = NULL/i);
  assert.match(recoveryQuery.text, /lock_expires_at = NULL/i);
  assert.deepEqual(recoveryQuery.params, ['processing', 'queued']);

  const firstHistoryInsert = db.calls[1];
  assert.match(firstHistoryInsert.text, /INSERT INTO job_status_history/i);
  assert.deepEqual(firstHistoryInsert.params, [
    'job-1',
    'processing',
    'queued',
    'Worker lock expired; job re-queued for retry.',
    'worker-recovery',
  ]);

  const secondHistoryInsert = db.calls[2];
  assert.match(secondHistoryInsert.text, /INSERT INTO job_status_history/i);
  assert.deepEqual(secondHistoryInsert.params, [
    'job-2',
    'processing',
    'queued',
    'Worker lock expired; job re-queued for retry.',
    'worker-recovery',
  ]);
}

async function testSkipsNonExpiredJobs(): Promise<void> {
  const db = new MockDb([
    {
      rowCount: 0,
      rows: [],
    },
  ]);

  const recoveredJobIds = await recoverExpiredProcessingJobs(db as never);

  assert.deepEqual(recoveredJobIds, []);
  assert.equal(db.calls.length, 1);
  assert.match(db.calls[0].text, /lock_expires_at < now\(\)/i);
}

async function run(): Promise<void> {
  try {
    await testRequeuesExpiredJobs();
    await testSkipsNonExpiredJobs();
    console.log('Recovery tests passed.');
  } catch (error) {
    console.error('Recovery tests failed.');
    throw error;
  } finally {
    await pool.end();
  }
}

void run();
