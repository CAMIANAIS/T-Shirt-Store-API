import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const ENV_FILE = join(__dirname, '.testcontainer-env.json');

export default async function globalTeardown() {
  const container = (
    global as typeof global & {
      __POSTGRES_CONTAINER__?: StartedPostgreSqlContainer;
    }
  ).__POSTGRES_CONTAINER__;

  await container?.stop();

  if (existsSync(ENV_FILE)) {
    unlinkSync(ENV_FILE);
  }
}
