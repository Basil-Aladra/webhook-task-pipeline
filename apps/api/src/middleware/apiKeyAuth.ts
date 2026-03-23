import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

import { pool } from '../db/pool';

type UnauthorizedResponse = {
  error: {
    code: 'UNAUTHORIZED';
    message: 'Invalid or missing API key';
  };
};

function unauthorizedResponse(): UnauthorizedResponse {
  return {
    error: {
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing API key',
    },
  };
}

// Simple API key auth for protecting CRUD/query endpoints.
// - Reads `x-api-key`
// - Hashes it with SHA256
// - Looks up the hash in `api_keys`
// - Rejects if missing, revoked, or not found
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const providedKey = req.header('x-api-key');

  if (!providedKey) {
    res.status(401).json(unauthorizedResponse());
    return;
  }

  const keyHash = crypto.createHash('sha256').update(providedKey).digest('hex');

  // Update `last_used_at` only if the key is valid and not revoked.
  const result = await pool.query<{ id: string }>(
    `
      WITH matched AS (
        SELECT id
        FROM api_keys
        WHERE key_hash = $1
          AND revoked_at IS NULL
        LIMIT 1
      )
      UPDATE api_keys
      SET last_used_at = now()
      WHERE id = (SELECT id FROM matched)
      RETURNING id
    `,
    [keyHash],
  );

  if (result.rowCount === 0) {
    res.status(401).json(unauthorizedResponse());
    return;
  }

  next();
}

