import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { user } from './users.schema';

export const accessLog = pgTable(
  'access_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    userId: uuid('userId').references(() => user.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }),
    action: varchar('action', { length: 64 }).notNull(),
    ipAddress: varchar('ipAddress', { length: 64 }),
    userAgent: text('userAgent'),
    details: text('details'),
  },
  (table) => [
    index('IDX_access_log_userId').on(table.userId),
    index('IDX_access_log_createdAt').on(table.createdAt),
    index('IDX_access_log_action').on(table.action),
  ],
);

export const systemSetting = pgTable('system_setting', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});
