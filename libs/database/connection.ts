import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface DrizzleConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
  /** node-postgres defaults to 10 if unset. */
  poolMax?: number;
}

/**
 * Opens an independent Postgres connection pool against the shared schema.
 * Each service (apps/backend, apps/auth-service, ...) calls this with its own
 * config to get its own pool — this is not a shared runtime connection, only
 * a shared table/column definition.
 */
export function createDrizzleConnection<TSchema extends Record<string, unknown>>(
  config: DrizzleConnectionConfig,
  schema: TSchema,
): NodePgDatabase<TSchema> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    max: config.poolMax ?? 10,
  });
  return drizzle(pool, { schema });
}
