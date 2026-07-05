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

// Enums
export const mailStatusEnum = pgEnum('MailStatus', ['pending', 'sent', 'failed']);
export const mailTemplateTypeEnum = pgEnum('MailTemplateType', [
  'welcome',
  'reset-password',
  'contact-form',
  'magic-link-login',
  'oauth-first-login',
  'oauth-account-linked',
  'notification',
]);

// mail_template table
export const mailTemplate = pgTable(
  'mail_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    name: mailTemplateTypeEnum('name').notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    content: text('content'),
    isActive: boolean('isActive').default(true),
  },
  (table) => [
    uniqueIndex('IDX_mail_template_name').on(table.name),
    index('IDX_mail_template_createdAt').on(table.createdAt),
    index('IDX_mail_template_updatedAt').on(table.updatedAt),
    index('IDX_mail_template_deletedAt').on(table.deletedAt),
  ],
);

// mail table
export const mail = pgTable(
  'mail',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    to: varchar('to', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    templateId: uuid('templateId')
      .notNull()
      .references(() => mailTemplate.id, { onDelete: 'cascade' }),
    status: mailStatusEnum('status').default('pending'),
    variables: jsonb('variables').notNull(),
    attempts: integer('attempts').default(0),
    errorMessage: text('errorMessage'),
    sentAt: timestamp('sentAt', { withTimezone: true }),
  },
  (table) => [
    index('IDX_mail_createdAt').on(table.createdAt),
    index('IDX_mail_updatedAt').on(table.updatedAt),
    index('IDX_mail_deletedAt').on(table.deletedAt),
  ],
);
