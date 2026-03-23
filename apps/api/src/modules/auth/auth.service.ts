import crypto from 'node:crypto';
import { pool } from '../../db/pool';

export type GeneratedApiKey = {
  id: string;
  name: string;
  key: string; // returned only once
};

function generateRandomApiKey(): string {
  // 32 hex chars => 16 random bytes.
  const randomHex = crypto.randomBytes(16).toString('hex');
  return `wpk_${randomHex}`;
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Generates a random API key, stores only its hash, and returns the plain key once.
export async function generateApiKey(name: string): Promise<GeneratedApiKey> {
  const key = generateRandomApiKey();
  const keyHash = sha256Hex(key);

  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO api_keys (name, key_hash)
      VALUES ($1, $2)
      RETURNING id
    `,
    [name, keyHash],
  );

  return {
    id: result.rows[0].id,
    name,
    key,
  };
}

