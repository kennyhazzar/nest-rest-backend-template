import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import { mail, mailTemplate } from '@/common/drizzle/schema';
import * as schema from '@/common/drizzle/schema';
import { IdType } from '@/interfaces/id.type';
import { Mail, MailStatus, MailTemplateType } from '../../domain';
import { MailRepository } from '../../domain/repositories/mail.repository';

type MailRow = typeof mail.$inferSelect;
type TemplateRow = typeof mailTemplate.$inferSelect;

@Injectable()
export class MailRepositoryDrizzle extends MailRepository {
  private readonly logger = new Logger(MailRepositoryDrizzle.name);

  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  async create(value: Omit<Mail, 'id'>): Promise<Mail> {
    const [template] = await this.db
      .select()
      .from(mailTemplate)
      .where(and(eq(mailTemplate.name, value.template), isNull(mailTemplate.deletedAt)))
      .limit(1);
    if (!template) {
      this.logger.error(`Template not found: ${value.template}`);
      throw new BadRequestException('mail.templateNotFound');
    }
    const [row] = await this.db
      .insert(mail)
      .values({
        to: value.to,
        subject: value.subject,
        templateId: template.id,
        variables: value.context,
        status: value.status,
        attempts: value.attempts,
        sentAt: value.sentAt,
        errorMessage: value.errorMessage,
      })
      .returning();
    return this.toDomain(row, template);
  }

  async findById(id: IdType): Promise<Mail | null> {
    const [row] = await this.db
      .select({ mail, template: mailTemplate })
      .from(mail)
      .innerJoin(mailTemplate, eq(mail.templateId, mailTemplate.id))
      .where(and(eq(mail.id, id), isNull(mail.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row.mail, row.template) : null;
  }

  async findByStatus(status: MailStatus): Promise<Mail[]> {
    const rows = await this.db
      .select({ mail, template: mailTemplate })
      .from(mail)
      .innerJoin(mailTemplate, eq(mail.templateId, mailTemplate.id))
      .where(and(eq(mail.status, status), isNull(mail.deletedAt)));
    return rows.map((row) => this.toDomain(row.mail, row.template));
  }

  async update(id: IdType, update: Partial<Mail>): Promise<Mail> {
    await this.db
      .update(mail)
      .set({
        status: update.status,
        attempts: update.attempts,
        sentAt: update.sentAt,
        errorMessage: update.errorMessage,
        variables: update.context,
        updatedAt: new Date(),
      })
      .where(eq(mail.id, id));
    const result = await this.findById(id);
    if (!result) throw new Error('mail.notFound');
    return result;
  }

  async delete(id: IdType): Promise<void> {
    await this.db.update(mail).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(mail.id, id));
  }

  findPendingMails(): Promise<Mail[]> {
    return this.findByStatus(MailStatus.PENDING);
  }

  findFailedMails(): Promise<Mail[]> {
    return this.findByStatus(MailStatus.FAILED);
  }

  private toDomain(row: MailRow, template: TemplateRow): Mail {
    return new Mail(
      row.id,
      row.to,
      row.subject,
      template.name as MailTemplateType,
      row.variables as Record<string, any>,
      (row.status ?? MailStatus.PENDING) as MailStatus,
      row.attempts ?? 0,
      row.createdAt,
      row.sentAt ?? undefined,
      row.errorMessage ?? undefined,
    );
  }
}
