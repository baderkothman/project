import fs from 'node:fs/promises';
import { config } from './config';
import { checkDatabaseConnection, pool } from './db';
import { attachRealtimeServer } from './realtime';
import { app, server } from './app';

export { app, server };

async function start() {
  await fs.mkdir(config.uploadDirectory, { recursive: true });
  const database = await checkDatabaseConnection();
  attachRealtimeServer(server);
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Local API listening at ${config.publicApiUrl}`);
    console.log(`Connected to PostgreSQL database ${database.database}`);
  });
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
