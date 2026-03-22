import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables so DATABASE_URL is available.
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Add it to your .env file.');
}

// Shared PostgreSQL connection pool for the worker service.
export const pool = new Pool({
  connectionString: databaseUrl,
});
