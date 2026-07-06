import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createDrizzleConnection } from '@libs/database/connection';
import * as schema from '@libs/database/users.schema';

export const DRIZZLE_CONNECTION = 'DRIZZLE_CONNECTION';

export const DrizzleProvider = {
  provide: DRIZZLE_CONNECTION,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): NodePgDatabase<typeof schema> => {
    return createDrizzleConnection(
      {
        host: configService.get('database.host', 'localhost'),
        port: configService.get<number>('database.port', 5432),
        user: configService.getOrThrow('database.username'),
        password: String(configService.get('database.password', '')),
        database: configService.getOrThrow('database.db'),
        ssl: configService.get<boolean>('database.ssl', false),
        poolMax: configService.get<number>('database.poolMax', 10),
      },
      schema,
    );
  },
};
