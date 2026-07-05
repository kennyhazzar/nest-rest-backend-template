import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import {
  CaptchaAsset,
  CaptchaAssetStatus,
  CaptchaAttempt,
  CaptchaChallenge,
  CaptchaChallengeStatus,
  CaptchaConfig,
  CaptchaConfigStatus,
  CaptchaDifficulty,
  CaptchaTemplate,
  CaptchaTemplateStatus,
} from '../../domain/captcha.types';
import {
  CaptchaRepository,
  CreateCaptchaAssetData,
  CreateCaptchaAttemptData,
  CreateCaptchaChallengeData,
  CreateCaptchaConfigData,
  CreateCaptchaTemplateData,
} from '../../domain/repositories/captcha.repository';

type TemplateRow = typeof schema.captchaTemplate.$inferSelect;
type ConfigRow = typeof schema.captchaConfig.$inferSelect;
type AssetRow = typeof schema.captchaAsset.$inferSelect;
type ChallengeRow = typeof schema.captchaChallenge.$inferSelect;
type AttemptRow = typeof schema.captchaAttempt.$inferSelect;

@Injectable()
export class CaptchaRepositoryDrizzle extends CaptchaRepository {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {
    super();
  }

  async createTemplate(data: CreateCaptchaTemplateData): Promise<CaptchaTemplate> {
    const [row] = await this.db.insert(schema.captchaTemplate).values(data).returning();
    return this.toTemplate(row);
  }

  async listTemplates(): Promise<CaptchaTemplate[]> {
    const rows = await this.db.select().from(schema.captchaTemplate).orderBy(desc(schema.captchaTemplate.createdAt));
    return rows.map(this.toTemplate);
  }

  async findTemplateById(id: string): Promise<CaptchaTemplate | null> {
    const [row] = await this.db.select().from(schema.captchaTemplate).where(eq(schema.captchaTemplate.id, id)).limit(1);
    return row ? this.toTemplate(row) : null;
  }

  async findTemplateByCode(code: string): Promise<CaptchaTemplate | null> {
    const [row] = await this.db
      .select()
      .from(schema.captchaTemplate)
      .where(eq(schema.captchaTemplate.code, code))
      .limit(1);
    return row ? this.toTemplate(row) : null;
  }

  async nextConfigVersion(templateId: string): Promise<number> {
    const [row] = await this.db
      .select({ value: sql<number>`coalesce(max(${schema.captchaConfig.version}), 0) + 1` })
      .from(schema.captchaConfig)
      .where(eq(schema.captchaConfig.templateId, templateId));
    return Number(row?.value ?? 1);
  }

  async createConfig(data: CreateCaptchaConfigData): Promise<CaptchaConfig> {
    const [row] = await this.db.insert(schema.captchaConfig).values(data).returning();
    return this.toConfig(row);
  }

  async listConfigs(templateId: string): Promise<CaptchaConfig[]> {
    const rows = await this.db
      .select()
      .from(schema.captchaConfig)
      .where(eq(schema.captchaConfig.templateId, templateId))
      .orderBy(desc(schema.captchaConfig.version));
    return rows.map(this.toConfig);
  }

  async findConfigById(id: string): Promise<CaptchaConfig | null> {
    const [row] = await this.db.select().from(schema.captchaConfig).where(eq(schema.captchaConfig.id, id)).limit(1);
    return row ? this.toConfig(row) : null;
  }

  async findActiveConfig(templateId: string): Promise<CaptchaConfig | null> {
    const [row] = await this.db
      .select()
      .from(schema.captchaConfig)
      .where(and(eq(schema.captchaConfig.templateId, templateId), eq(schema.captchaConfig.status, 'active')))
      .limit(1);
    return row ? this.toConfig(row) : null;
  }

  async activateConfig(id: string): Promise<CaptchaConfig> {
    const config = await this.findConfigById(id);
    if (!config) throw new NotFoundException('captcha.config.notFound');

    await this.db
      .update(schema.captchaConfig)
      .set({ status: CaptchaConfigStatus.ARCHIVED })
      .where(and(eq(schema.captchaConfig.templateId, config.templateId), eq(schema.captchaConfig.status, 'active')));

    const [row] = await this.db
      .update(schema.captchaConfig)
      .set({ status: CaptchaConfigStatus.ACTIVE, activatedAt: new Date() })
      .where(eq(schema.captchaConfig.id, id))
      .returning();
    return this.toConfig(row);
  }

  async createAsset(data: CreateCaptchaAssetData): Promise<CaptchaAsset> {
    const [row] = await this.db.insert(schema.captchaAsset).values(data).returning();
    return this.toAsset(row);
  }

  async findAssetById(id: string): Promise<CaptchaAsset | null> {
    const [row] = await this.db.select().from(schema.captchaAsset).where(eq(schema.captchaAsset.id, id)).limit(1);
    return row ? this.toAsset(row) : null;
  }

  async reserveAsset(id: string): Promise<CaptchaAsset | null> {
    const [row] = await this.db
      .update(schema.captchaAsset)
      .set({ status: CaptchaAssetStatus.RESERVED })
      .where(
        and(
          eq(schema.captchaAsset.id, id),
          eq(schema.captchaAsset.status, CaptchaAssetStatus.AVAILABLE),
          sql`${schema.captchaAsset.expiresAt} > now()`,
        ),
      )
      .returning();
    return row ? this.toAsset(row) : null;
  }

  async markAssetUsed(id: string): Promise<void> {
    await this.db
      .update(schema.captchaAsset)
      .set({ status: CaptchaAssetStatus.USED, usedCount: sql`${schema.captchaAsset.usedCount} + 1` })
      .where(eq(schema.captchaAsset.id, id));
  }

  async createChallenge(data: CreateCaptchaChallengeData): Promise<CaptchaChallenge> {
    const [row] = await this.db.insert(schema.captchaChallenge).values(data).returning();
    return this.toChallenge(row);
  }

  async findChallengeById(id: string): Promise<CaptchaChallenge | null> {
    const [row] = await this.db
      .select()
      .from(schema.captchaChallenge)
      .where(eq(schema.captchaChallenge.id, id))
      .limit(1);
    return row ? this.toChallenge(row) : null;
  }

  async completeChallenge(id: string, status: CaptchaChallengeStatus): Promise<CaptchaChallenge> {
    const [row] = await this.db
      .update(schema.captchaChallenge)
      .set({ status, completedAt: new Date() })
      .where(eq(schema.captchaChallenge.id, id))
      .returning();
    return this.toChallenge(row);
  }

  async incrementChallengeAttempts(id: string): Promise<void> {
    await this.db
      .update(schema.captchaChallenge)
      .set({ attemptsCount: sql`${schema.captchaChallenge.attemptsCount} + 1` })
      .where(eq(schema.captchaChallenge.id, id));
  }

  async createAttempt(data: CreateCaptchaAttemptData): Promise<CaptchaAttempt> {
    const [row] = await this.db.insert(schema.captchaAttempt).values(data).returning();
    return this.toAttempt(row);
  }

  async countAssetsByStatus(): Promise<Array<{ status: string; difficulty: string; count: number }>> {
    const rows = await this.db
      .select({
        status: schema.captchaAsset.status,
        difficulty: schema.captchaAsset.difficulty,
        value: count(),
      })
      .from(schema.captchaAsset)
      .groupBy(schema.captchaAsset.status, schema.captchaAsset.difficulty);
    return rows.map((row) => ({ status: row.status, difficulty: row.difficulty, count: Number(row.value) }));
  }

  async countChallenges(): Promise<{ total: number; passed: number; failed: number; pending: number }> {
    const rows = await this.db
      .select({ status: schema.captchaChallenge.status, value: count() })
      .from(schema.captchaChallenge)
      .groupBy(schema.captchaChallenge.status);
    const map = new Map(rows.map((row) => [row.status, Number(row.value)]));
    return {
      total: rows.reduce((sum, row) => sum + Number(row.value), 0),
      passed: map.get(CaptchaChallengeStatus.PASSED) ?? 0,
      failed: map.get(CaptchaChallengeStatus.FAILED) ?? 0,
      pending: map.get(CaptchaChallengeStatus.PENDING) ?? 0,
    };
  }

  private toTemplate = (row: TemplateRow): CaptchaTemplate => ({
    ...row,
    status: row.status as CaptchaTemplateStatus,
    defaultDifficulty: row.defaultDifficulty as CaptchaDifficulty,
  });

  private toConfig = (row: ConfigRow): CaptchaConfig => ({
    ...row,
    status: row.status as CaptchaConfigStatus,
    configJson: row.configJson ?? {},
  });

  private toAsset = (row: AssetRow): CaptchaAsset => ({
    ...row,
    difficulty: row.difficulty as CaptchaDifficulty,
    status: row.status as CaptchaAssetStatus,
    metadataJson: row.metadataJson ?? {},
  });

  private toChallenge = (row: ChallengeRow): CaptchaChallenge => ({
    ...row,
    context: row.context as CaptchaChallenge['context'],
    status: row.status as CaptchaChallengeStatus,
  });

  private toAttempt = (row: AttemptRow): CaptchaAttempt => row;
}
