import pg from 'pg';

const databaseName = 'book_exchange_local';
const databaseUser = process.env.USER ?? '';

async function main() {
  if (process.env.CONFIRM_DB_RESET !== databaseName) {
    throw new Error(
      `Refusing to reset the database. Re-run with CONFIRM_DB_RESET=${databaseName}.`,
    );
  }
  const admin = new pg.Client({
    connectionString: `postgresql://${encodeURIComponent(databaseUser)}@127.0.0.1:5432/postgres`,
  });
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid)
     FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [databaseName],
  );
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await admin.end();
  console.log(`Dropped ${databaseName}. Run npm run db:setup to recreate it.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

