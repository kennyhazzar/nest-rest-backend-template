import { pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';

/**
 * Minimal local mirror of apps/backend's `mail`/`mail_template` tables (see
 * apps/backend/src/common/drizzle/schema/mail.schema.ts, the canonical owner).
 *
 * auth-service only ever looks up a template id by name and inserts a queued mail row —
 * it does not own this table and never migrates it. Duplicated here (rather than pulled
 * into libs/database) because the mail module — templating, SMTP sending, the processor —
 * stays entirely in apps/backend; this is just enough shape to construct the same insert
 * that SendMailHandler already performs today.
 */
const mailStatusEnum = pgEnum('MailStatus', ['pending', 'sent', 'failed']);
const mailTemplateTypeEnum = pgEnum('MailTemplateType', [
  'welcome',
  'reset-password',
  'contact-form',
  'magic-link-login',
  'oauth-first-login',
  'oauth-account-linked',
  'notification',
]);

export const mailTemplate = pgTable('mail_template', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { withTimezone: true }),
  name: mailTemplateTypeEnum('name').notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  content: text('content'),
  isActive: boolean('isActive').default(true),
});

export const mail = pgTable('mail', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deletedAt', { withTimezone: true }),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  templateId: uuid('templateId').notNull(),
  status: mailStatusEnum('status').default('pending'),
  variables: jsonb('variables').notNull(),
  attempts: integer('attempts').default(0),
  errorMessage: text('errorMessage'),
  sentAt: timestamp('sentAt', { withTimezone: true }),
});
