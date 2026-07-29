import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

const root = process.cwd();
const localEnvPath = path.join(root, '.env.local');
const databaseName = 'book_exchange_local';
const databaseUser = process.env.USER ?? '';
const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${encodeURIComponent(databaseUser)}@127.0.0.1:5432/${databaseName}`;

async function readEnvFile(filePath: string) {
  try {
    return dotenv.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return {};
  }
}

async function ensureLocalEnvironment() {
  const current = await readEnvFile(localEnvPath);
  const localValues = {
    API_PORT: current.API_PORT ?? '4000',
    PUBLIC_API_URL: current.PUBLIC_API_URL ?? 'http://127.0.0.1:4000',
    EXPO_PUBLIC_API_URL: current.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:4000',
    DATABASE_URL: current.DATABASE_URL ?? databaseUrl,
    JWT_SECRET: current.JWT_SECRET ?? crypto.randomBytes(48).toString('base64url'),
    JWT_TTL: current.JWT_TTL ?? '7d',
    CORS_ORIGINS: current.CORS_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081',
    GOOGLE_BOOKS_API_KEY: current.GOOGLE_BOOKS_API_KEY ?? '',
    STRIPE_SECRET_KEY: current.STRIPE_SECRET_KEY ?? '',
    STRIPE_SUCCESS_URL: current.STRIPE_SUCCESS_URL ?? 'bookexchange://success',
    STRIPE_CANCEL_URL: current.STRIPE_CANCEL_URL ?? 'bookexchange://cancel',
  };
  const content = Object.entries(localValues)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  await fs.writeFile(localEnvPath, `${content}\n`, { mode: 0o600 });
  return localValues;
}

async function main() {
  const env = await ensureLocalEnvironment();
  const admin = new pg.Client({
    connectionString: `postgresql://${encodeURIComponent(databaseUser)}@127.0.0.1:5432/postgres`,
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    console.log(`Created database ${databaseName}`);
  } else {
    console.log(`Database ${databaseName} already exists`);
  }
  await admin.end();

  const app = new pg.Client({ connectionString: env.DATABASE_URL });
  await app.connect();
  await app.query(await fs.readFile(path.join(root, 'server/db/schema.sql'), 'utf8'));
  await app.query(await fs.readFile(path.join(root, 'server/db/seed.sql'), 'utf8'));
  await app.end();
  console.log('Applied schema and development seed data');
  console.log('Demo login: demo@bookexchange.local / DemoPass123!');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
