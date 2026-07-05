const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { loadConfig } = require('./load-config.cjs');

const root = process.cwd();
const config = loadConfig(root);
const database = config.database || {};
const migrationsDir = path.join(root, 'drizzle/migrations');
const journalPath = path.join(migrationsDir, 'meta/_journal.json');
const client = new Client({
  host: database.host || 'localhost',
  port: Number(database.port || 5432),
  user: database.username,
  password: String(database.password || ''),
  database: database.db || 'app',
  ssl: database.ssl ? { rejectUnauthorized: false } : false,
});

const splitStatements = (sql) =>
  sql.split('--> statement-breakpoint').map((statement) => statement.trim()).filter(Boolean);

async function main() {
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  await client.connect();
  await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  const rows = await client.query('SELECT hash FROM drizzle.__drizzle_migrations');
  const applied = new Set(rows.rows.map((row) => row.hash));
  for (const entry of journal.entries) {
    const fileName = `${entry.tag}.sql`;
    const sql = readFileSync(path.join(migrationsDir, fileName), 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    if (applied.has(hash)) {
      console.log(`skip ${fileName}`);
      continue;
    }
    console.log(`apply ${fileName}`);
    for (const statement of splitStatements(sql)) await client.query(statement);
    await client.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
      [hash, entry.when],
    );
  }
  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => undefined);
  process.exit(1);
});
