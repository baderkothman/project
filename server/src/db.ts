import pg from 'pg';
import { config } from './config';

pg.types.setTypeParser(20, (value) => Number(value));
pg.types.setTypeParser(1700, (value) => Number(value));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function checkDatabaseConnection() {
  const result = await pool.query<{ database: string; version: string }>(
    'SELECT current_database() AS database, version() AS version',
  );
  return result.rows[0];
}

