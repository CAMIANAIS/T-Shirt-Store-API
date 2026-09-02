import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = join(__dirname, '.testcontainer-env.json');

export default async function globalSetup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const connectionUri = container.getConnectionUri();

  const schemaSql = readFileSync(
    join(__dirname, '../../docs/schemaERD.sql'),
    'utf-8',
  );
  const client = new Client({ connectionString: connectionUri });
  await client.connect();
  await client.query(schemaSql);
  await client.end();

  writeFileSync(ENV_FILE, JSON.stringify({ DATABASE_URL: connectionUri }));

  // Stashed on `global` so global-teardown.ts (same orchestrating process)
  // can stop the same container instance.
  (
    global as typeof global & { __POSTGRES_CONTAINER__?: unknown }
  ).__POSTGRES_CONTAINER__ = container;
}
