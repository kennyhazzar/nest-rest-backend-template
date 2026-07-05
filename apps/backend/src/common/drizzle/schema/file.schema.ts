import { pgTable, uuid, varchar, integer, text, timestamp, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './users.schema';

// Enums
export const fileFromEnum = pgEnum('FileFrom', ['USER', 'PUBLIC']);
export const fileTypeEnum = pgEnum('FileType', ['USER_FILE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER']);

// file_version table — forward declared for circular reference with file
export const fileVersion = pgTable(
  'file-version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    mimetype: varchar('mimetype').notNull(),
    size: integer('size').notNull(),
    versionId: varchar('versionId'),
    fileId: uuid('fileId').references((): any => file.id),
    userId: uuid('userId').references(() => user.id),
  },
  (table) => [
    uniqueIndex('unique_version_file').on(table.versionId, table.fileId),
    index('idx_file_version_versionId').on(table.versionId),
    index('idx_file_version_userId').on(table.userId),
    index('IDX_file_version_createdAt').on(table.createdAt),
    index('IDX_file_version_updatedAt').on(table.updatedAt),
    index('IDX_file_version_deletedAt').on(table.deletedAt),
  ],
);

// file table
export const file = pgTable(
  'file',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deletedAt', { withTimezone: true }),
    name: varchar('name', { length: 255 }).notNull(),
    path: varchar('path').notNull(),
    module: fileFromEnum('module').notNull(),
    externalId: uuid('externalId').notNull(),
    description: text('description'),
    type: fileTypeEnum('type').default('OTHER'),
    lastVersionId: uuid('lastVersionId').references(() => fileVersion.id),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    uniqueIndex('U_name_module_externalId').on(table.name, table.module, table.externalId),
    uniqueIndex('U_name_path').on(table.name, table.path),
    index('idx_file_name').on(table.name),
    index('idx_file_path').on(table.path),
    index('idx_file_module').on(table.module),
    index('idx_file_externalId').on(table.externalId),
    index('IDX_file_createdAt').on(table.createdAt),
    index('IDX_file_updatedAt').on(table.updatedAt),
    index('IDX_file_deletedAt').on(table.deletedAt),
  ],
);
