import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Client, Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../../apps/backend/src/common/drizzle/schema';

const ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle/migrations');
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta/_journal.json');

function getTestDsn(): { host: string; port: number; user: string; password: string; database: string } {
  const url = process.env.TEST_DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '5432', 10),
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.slice(1),
    };
  }
  // Fallback to env vars used by GitLab CI service
  return {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? '12345678',
    database: process.env.POSTGRES_DB ?? 'app_test',
  };
}

export async function runMigrations(): Promise<void> {
  const config = getTestDsn();
  const client = new Client(config);

  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as {
    entries: Array<{ tag: string; when: number }>;
  };

  await client.connect();

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id serial PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const rows = await client.query<{ hash: string }>('SELECT hash FROM drizzle.__drizzle_migrations');
    const applied = new Set(rows.rows.map((r) => r.hash));

    for (const entry of journal.entries) {
      const fileName = `${entry.tag}.sql`;
      const sqlContent = readFileSync(path.join(MIGRATIONS_DIR, fileName), 'utf8');
      const hash = createHash('sha256').update(sqlContent).digest('hex');

      if (applied.has(hash)) continue;

      const statements = sqlContent
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await client.query(statement);
      }

      await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [
        hash,
        entry.when,
      ]);
    }
  } finally {
    await client.end();
  }
}

let pool: Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

export function getTestDb(): NodePgDatabase<typeof schema> {
  if (db) return db;
  pool = new Pool(getTestDsn());
  db = drizzle(pool, { schema });
  return db;
}

// Tables truncated between tests. Omits seed-only tables:
// user_role, role_permission, notification_template, system_setting, mail_template
const TRUNCATE_SQL = `
  TRUNCATE
    access_log,
    notification,
    "file-version",
    file,
    mail,
    magic_link_token,
    password_reset_token,
    refresh,
    "user"
  RESTART IDENTITY CASCADE
`;

export async function truncateAll(): Promise<void> {
  await getTestDb().execute(sql.raw(TRUNCATE_SQL));
}

export async function closeTestDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
