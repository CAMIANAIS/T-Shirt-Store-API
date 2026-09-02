import { readFileSync } from 'fs';
import { join } from 'path';

const ENV_FILE = join(__dirname, '.testcontainer-env.json');
const { DATABASE_URL } = JSON.parse(readFileSync(ENV_FILE, 'utf-8')) as {
  DATABASE_URL: string;
};

process.env.DATABASE_URL = DATABASE_URL;
