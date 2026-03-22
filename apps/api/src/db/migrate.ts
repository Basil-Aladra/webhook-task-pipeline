import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { logger } from '../shared/logger';
import { Client } from 'pg';

// Load environment variables from the repository root .env file.
dotenv.config();

async function resolveMigrationsDir(): Promise<string> {
  const candidates = [
    // Docker workspace root candidate (when running from /app/apps/api).
    path.resolve('/app/infra/postgres/migrations'),
    // Running from repository root.
    path.resolve(process.cwd(), 'infra/postgres/migrations'),
    // Running from apps/api workspace.
    path.resolve(process.cwd(), '../../infra/postgres/migrations'),
    // Running from compiled dist output.
    path.resolve(__dirname, '../../../../infra/postgres/migrations'),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new Error('Could not find infra/postgres/migrations directory.');
}

async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Add it to your .env file.');
  }

  const migrationsDir = await resolveMigrationsDir();
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    logger.info('No migration files found');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = await readFile(filePath, 'utf8');

      if (!sql.trim()) {
        continue;
      }

      logger.info('Running migration file', { file });

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    logger.info('Migrations completed successfully');
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  logger.error('Migration failed', {}, error);
  process.exit(1);
});
