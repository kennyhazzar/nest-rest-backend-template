import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '@libs/database/users.schema';
import { DRIZZLE_CONNECTION } from '../../../../drizzle.provider';
import { mail, mailTemplate } from './mail-producer.schema';

export interface QueueMailPayload {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

/**
 * Minimal mirror of mail module's SendMailHandler (apps/backend), reusing the same
 * `mail`/`mail_template` tables and the same BullMQ `mail` queue — templating/SMTP sending
 * stays centralized in apps/backend's MailProcessor, this just enqueues the job.
 */
@Injectable()
export class MailProducerService {
  private readonly logger = new Logger(MailProducerService.name);

  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    @InjectQueue('mail') private readonly mailQueue: Queue,
  ) {}

  async queueMail(payload: QueueMailPayload): Promise<void> {
    const [template] = await this.db
      .select()
      .from(mailTemplate)
      .where(and(eq(mailTemplate.name, payload.template as (typeof mailTemplate.name.enumValues)[number]), isNull(mailTemplate.deletedAt)))
      .limit(1);

    if (!template) {
      throw new BadRequestException('mail.templateNotFound');
    }

    const [row] = await this.db
      .insert(mail)
      .values({
        to: payload.to,
        subject: payload.subject,
        templateId: template.id,
        variables: payload.context,
        status: 'pending',
        attempts: 0,
      })
      .returning();

    await this.mailQueue.add('send-mail', {
      mailId: row.id,
      to: payload.to,
      subject: payload.subject,
      template: payload.template,
      context: payload.context,
    });

    this.logger.log(`Mail queued: mailId=${row.id} to=${payload.to} template=${payload.template}`);
  }
}
