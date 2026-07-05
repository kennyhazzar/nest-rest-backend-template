import type { Config } from 'drizzle-kit';
import * as yaml from 'js-yaml';
import { existsSync, readFileSync } from 'node:fs';

const configFile = process.env.CONFIG_FILE ?? (process.env.NODE_ENV === 'test' ? 'config.test.yaml' : 'config.yaml');
const config = existsSync(configFile) ? (yaml.load(readFileSync(configFile, 'utf8')) as any) : {};
const db = config.database ?? {};

export default {
  schema: './apps/backend/src/common/drizzle/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: db.host ?? 'localhost',
    port: db.port ?? 5432,
    user: db.username,
    password: String(db.password),
    database: db.db ?? 'app',
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
  },
} satisfies Config;
