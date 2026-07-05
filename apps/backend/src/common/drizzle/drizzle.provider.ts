import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const DRIZZLE_CONNECTION = 'DRIZZLE_CONNECTION';

export const DrizzleProvider = {
  provide: DRIZZLE_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): NodePgDatabase<typeof schema> => {
    const pool = new Pool({
      host: configService.get('database.host', 'localhost'),
      port: configService.get<number>('database.port', 5432),
      user: configService.get('database.username'),
      password: String(configService.get('database.password', '')),
      database: configService.get('database.db'),
      ssl: configService.get<boolean>('database.ssl', false) ? { rejectUnauthorized: false } : false,
    });
    return drizzle(pool, { schema });
  },
};
