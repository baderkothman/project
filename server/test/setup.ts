import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';

process.env.NODE_ENV = 'test';

const databaseName = 'book_exchange_test';
const databaseUser = process.env.USER ?? '';
process.env.DATABASE_URL ??= `postgresql://${encodeURIComponent(databaseUser)}@127.0.0.1:5432/${databaseName}`;
process.env.JWT_SECRET ??= 'test-only-secret-do-not-use-in-production';
process.env.JWT_TTL ??= '7d';
process.env.CORS_ORIGINS ??= 'http://localhost:8081';

export async function resetTestDatabase() {
  const admin = new pg.Client({
    connectionString: `postgresql://${encodeURIComponent(databaseUser)}@127.0.0.1:5432/postgres`,
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  }
  await admin.end();

  const root = process.cwd();
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(await fs.readFile(path.join(root, 'server/db/schema.sql'), 'utf8'));
  await client.query(
    'TRUNCATE users, profiles, books, followers, wishlist, messages, shared_books RESTART IDENTITY CASCADE',
  );
  await client.end();
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}@example.com`;
}
