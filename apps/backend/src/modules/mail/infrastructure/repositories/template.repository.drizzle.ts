import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import { mailTemplate } from '@/common/drizzle/schema';
import * as schema from '@/common/drizzle/schema';
import { IdType } from '@/interfaces/id.type';
import { MailTemplateType } from '../../domain';
import { Template } from '../../domain/entities/template.entity';
import { TemplateRepository } from '../../domain/repositories/template.repository';

type TemplateRow = typeof mailTemplate.$inferSelect;

@Injectable()
export class TemplateRepositoryDrizzle extends TemplateRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  async count(): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(mailTemplate)
      .where(isNull(mailTemplate.deletedAt));
    return value;
  }

  async create(value: {
    name: MailTemplateType;
    subject: string;
    content?: string;
    isActive?: boolean;
  }): Promise<Template> {
    const [row] = await this.db
      .insert(mailTemplate)
      .values({
        name: value.name,
        subject: value.subject,
        content: value.content,
        isActive: value.isActive ?? true,
      })
      .returning();
    return this.toDomain(row);
  }

  async findById(id: IdType): Promise<Template | null> {
    const [row] = await this.db
      .select()
      .from(mailTemplate)
      .where(and(eq(mailTemplate.id, id), isNull(mailTemplate.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByName(name: MailTemplateType): Promise<Template | null> {
    const [row] = await this.db
      .select()
      .from(mailTemplate)
      .where(and(eq(mailTemplate.name, name), isNull(mailTemplate.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findAll(): Promise<Template[]> {
    const rows = await this.db.select().from(mailTemplate).where(isNull(mailTemplate.deletedAt));
    return rows.map((row) => this.toDomain(row));
  }

  async findActive(): Promise<Template[]> {
    const rows = await this.db
      .select()
      .from(mailTemplate)
      .where(and(eq(mailTemplate.isActive, true), isNull(mailTemplate.deletedAt)));
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: IdType, value: { subject?: string; content?: string; isActive?: boolean }): Promise<Template> {
    const [row] = await this.db
      .update(mailTemplate)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(mailTemplate.id, id), isNull(mailTemplate.deletedAt)))
      .returning();
    if (!row) throw new Error('mail.templateNotFound');
    return this.toDomain(row);
  }

  async delete(id: IdType): Promise<void> {
    await this.db
      .update(mailTemplate)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(mailTemplate.id, id));
  }

  private toDomain(row: TemplateRow): Template {
    return new Template(
      row.id,
      row.name,
      row.subject,
      row.content ?? undefined,
      row.isActive ?? true,
      row.createdAt,
      row.updatedAt,
    );
  }
}
