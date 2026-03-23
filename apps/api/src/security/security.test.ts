import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { AddressInfo } from 'node:net';

import { createApp } from '../main';
import { getLogs } from '../modules/logs/logs.repository';

type QueryCall = {
  text: string;
  params: unknown[];
};

type MockQueryable = {
  calls: QueryCall[];
  query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

function createMockQueryable(): MockQueryable {
  return {
    calls: [],
    async query<T>(text: string, params: unknown[] = []) {
      this.calls.push({ text, params });
      return { rows: [] as T[] };
    },
  };
}

describe('API security protections', () => {
  const app = createApp();
  let server: ReturnType<typeof app.listen>;
  let baseUrl = '';

  before(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  test('missing API key returns 401 without exposing data', async () => {
    const response = await fetch(`${baseUrl}/api/v1/jobs`);
    const json = (await response.json()) as {
      error?: { code?: string; message?: string };
      data?: unknown;
    };

    assert.equal(response.status, 401);
    assert.equal(json.error?.code, 'UNAUTHORIZED');
    assert.equal(json.error?.message, 'Invalid or missing API key');
    assert.equal('data' in json, false);
  });

  test('invalid webhook JSON returns structured 400 and does not crash', async () => {
    const response = await fetch(`${baseUrl}/api/v1/webhooks/test-pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"payload":',
    });

    const json = (await response.json()) as {
      error?: { code?: string; message?: string };
    };

    assert.equal(response.status, 400);
    assert.equal(json.error?.code, 'INVALID_JSON');
    assert.equal(json.error?.message, 'Request body contains invalid JSON.');
  });

  test('logs repository keeps SQL injection input out of query text', async () => {
    const db = createMockQueryable();
    const injectionAttempt = "' OR 1=1 --";

    await getLogs(
      {
        search: injectionAttempt,
        limit: 25,
      },
      db,
    );

    assert.equal(db.calls.length, 1);

    const [call] = db.calls;
    assert.match(call.text, /FROM logs/i);
    assert.match(call.text, /ILIKE \$1/i);
    assert.match(call.text, /LIMIT \$2/i);
    assert.equal(call.text.includes(injectionAttempt), false);
    assert.deepEqual(call.params, [`%${injectionAttempt}%`, 25]);
  });
});
