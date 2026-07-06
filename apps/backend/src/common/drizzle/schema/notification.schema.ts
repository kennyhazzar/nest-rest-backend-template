import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { user } from '@libs/database/users.schema';

// Enums
export const notificationTypeEnum = pgEnum('NotificationType', ['SYSTEM', 'INFO', 'WARNING', 'SUCCESS', 'ERROR']);
export const notificationChannelEnum = pgEnum('NotificationChannel', ['in_app', 'email', 'telegram', 'sms']);
export const notificationDeliveryStatusEnum = pgEnum('NotificationDeliveryStatus', ['pending', 'sent', 'failed']);

// notification_template table
export const notificationTemplate = pgTable(
  'notification_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    name: varchar('name', { length: 100 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    content: text('content').notNull(),
    isActive: boolean('isActive').default(true),
  },
  (table) => [
    uniqueIndex('IDX_notification_template_name').on(table.name),
    index('IDX_notification_template_createdAt').on(table.createdAt),
    index('IDX_notification_template_updatedAt').on(table.updatedAt),
    index('IDX_notification_template_deletedAt').on(table.deletedAt),
  ],
);

// notification table
export const notification = pgTable(
  'notification',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: notificationTypeEnum('type').default('INFO'),
    channel: notificationChannelEnum('channel').notNull().default('in_app'),
    status: notificationDeliveryStatusEnum('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: timestamp('nextAttemptAt', { withTimezone: true }),
    sentAt: timestamp('sentAt', { withTimezone: true }),
    failedAt: timestamp('failedAt', { withTimezone: true }),
    errorMessage: text('errorMessage'),
    isRead: boolean('isRead').default(false),
    metadata: jsonb('metadata'),
  },
  (table) => [
    index('IDX_notification_userId').on(table.userId),
    index('IDX_notification_channel').on(table.channel),
    index('IDX_notification_status').on(table.status),
    index('IDX_notification_nextAttemptAt').on(table.nextAttemptAt),
    index('IDX_notification_isRead').on(table.isRead),
    index('IDX_notification_type').on(table.type),
    index('IDX_notification_createdAt').on(table.createdAt),
    index('IDX_notification_updatedAt').on(table.updatedAt),
    index('IDX_notification_deletedAt').on(table.deletedAt),
  ],
);
