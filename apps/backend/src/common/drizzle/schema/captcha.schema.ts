import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from '@libs/database/users.schema';

export const captchaTemplateTypeEnum = pgEnum('captcha_template_type', ['image_text', 'math_expression']);
export const captchaTemplateStatusEnum = pgEnum('captcha_template_status', ['draft', 'active', 'archived']);
export const captchaConfigStatusEnum = pgEnum('captcha_config_status', ['draft', 'active', 'archived']);
export const captchaDifficultyEnum = pgEnum('captcha_difficulty', ['easy', 'medium', 'hard']);
export const captchaAssetStatusEnum = pgEnum('captcha_asset_status', [
  'available',
  'reserved',
  'used',
  'expired',
  'archived',
]);
export const captchaChallengeContextEnum = pgEnum('captcha_challenge_context', [
  'login',
  'register',
  'password_reset',
  'api_sensitive_action',
]);
export const captchaChallengeStatusEnum = pgEnum('captcha_challenge_status', [
  'pending',
  'passed',
  'failed',
  'expired',
]);
export const captchaFallbackStrategyEnum = pgEnum('captcha_fallback_strategy', [
  'deny_suspicious_allow_trusted',
  'allow_with_delay',
  'deny_all_suspicious',
]);

export const captchaTemplate = pgTable(
  'captcha_template',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    code: varchar('code', { length: 128 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: captchaTemplateTypeEnum('type').notNull().default('image_text'),
    status: captchaTemplateStatusEnum('status').notNull().default('draft'),
    defaultDifficulty: captchaDifficultyEnum('defaultDifficulty').notNull().default('medium'),
    generator: varchar('generator', { length: 128 }).notNull(),
  },
  (table) => [
    uniqueIndex('UQ_captcha_template_code').on(table.code),
    index('IDX_captcha_template_status').on(table.status),
  ],
);

export const captchaConfig = pgTable(
  'captcha_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    activatedAt: timestamp('activatedAt', { withTimezone: true }),
    templateId: uuid('templateId')
      .notNull()
      .references(() => captchaTemplate.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: captchaConfigStatusEnum('status').notNull().default('draft'),
    configJson: jsonb('configJson').$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: uuid('createdByUserId').references(() => user.id, { onDelete: 'set null' }),
  },
  (table) => [
    uniqueIndex('UQ_captcha_config_template_version').on(table.templateId, table.version),
    index('IDX_captcha_config_template_status').on(table.templateId, table.status),
  ],
);

export const captchaAsset = pgTable(
  'captcha_asset',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generatedAt: timestamp('generatedAt', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    templateId: uuid('templateId')
      .notNull()
      .references(() => captchaTemplate.id, { onDelete: 'cascade' }),
    configId: uuid('configId')
      .notNull()
      .references(() => captchaConfig.id, { onDelete: 'cascade' }),
    storageKey: text('storageKey').notNull(),
    answerHash: text('answerHash').notNull(),
    answerNormalizedHash: text('answerNormalizedHash').notNull(),
    difficulty: captchaDifficultyEnum('difficulty').notNull().default('medium'),
    status: captchaAssetStatusEnum('status').notNull().default('available'),
    usedCount: integer('usedCount').notNull().default(0),
    maxUses: integer('maxUses').notNull().default(1),
    metadataJson: jsonb('metadataJson').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index('IDX_captcha_asset_pool').on(table.templateId, table.difficulty, table.status, table.expiresAt),
    index('IDX_captcha_asset_config').on(table.configId),
  ],
);

export const captchaChallenge = pgTable(
  'captcha_challenge',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completedAt', { withTimezone: true }),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    assetId: uuid('assetId')
      .notNull()
      .references(() => captchaAsset.id, { onDelete: 'restrict' }),
    context: captchaChallengeContextEnum('context').notNull().default('login'),
    subjectHash: text('subjectHash'),
    riskScore: integer('riskScore').notNull().default(0),
    status: captchaChallengeStatusEnum('status').notNull().default('pending'),
    attemptsCount: integer('attemptsCount').notNull().default(0),
  },
  (table) => [
    index('IDX_captcha_challenge_status_expiresAt').on(table.status, table.expiresAt),
    index('IDX_captcha_challenge_context_createdAt').on(table.context, table.createdAt),
  ],
);

export const captchaAttempt = pgTable(
  'captcha_attempt',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    challengeId: uuid('challengeId')
      .notNull()
      .references(() => captchaChallenge.id, { onDelete: 'cascade' }),
    answerHash: text('answerHash').notNull(),
    isSuccess: boolean('isSuccess').notNull().default(false),
    solveTimeMs: integer('solveTimeMs'),
    ipHash: text('ipHash'),
    userAgentHash: text('userAgentHash'),
  },
  (table) => [
    index('IDX_captcha_attempt_challengeId').on(table.challengeId),
    index('IDX_captcha_attempt_createdAt').on(table.createdAt),
  ],
);

export const captchaPolicy = pgTable(
  'captcha_policy',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
    context: captchaChallengeContextEnum('context').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    minRiskForCaptcha: integer('minRiskForCaptcha').notNull().default(60),
    difficultyStrategy: jsonb('difficultyStrategy').$type<Record<string, unknown>>().notNull().default({}),
    fallbackStrategy: captchaFallbackStrategyEnum('fallbackStrategy')
      .notNull()
      .default('deny_suspicious_allow_trusted'),
    poolLowWatermark: integer('poolLowWatermark').notNull().default(20),
    poolTargetSize: integer('poolTargetSize').notNull().default(100),
  },
  (table) => [uniqueIndex('UQ_captcha_policy_context').on(table.context)],
);
