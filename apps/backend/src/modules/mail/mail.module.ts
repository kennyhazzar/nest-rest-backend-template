import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';

import { MailerModuleOptions } from '@/options';
import { MailRepository } from './domain/repositories/mail.repository';
import { MailRepositoryDrizzle } from './infrastructure/repositories/mail.repository.drizzle';
import { TemplateRepository } from './domain/repositories/template.repository';
import { TemplateRepositoryDrizzle } from './infrastructure/repositories/template.repository.drizzle';
import { MailService } from './infrastructure/services/mail.service';
import { TemplateService } from './infrastructure/services/template.service';
import { TemplateSeedService } from './infrastructure/services/template-seed.service';
import { MailProcessor } from './infrastructure/processors/mail.processor';
import {
  SendMailHandler,
  RetryFailedMailsHandler,
  GetMailStatusHandler,
  GetMailsByStatusHandler,
  CreateTemplateHandler,
  UpdateTemplateHandler,
  DeleteTemplateHandler,
  GetTemplateHandler,
  GetTemplateByNameHandler,
  GetAllTemplatesHandler,
  GetActiveTemplatesHandler,
  UserCreatedEmailEventHandler,
} from './application/handlers';

/**
 * Command handlers for mail module
 * Handle state-changing operations
 */
const CommandHandlers = [
  SendMailHandler,
  RetryFailedMailsHandler,
  CreateTemplateHandler,
  UpdateTemplateHandler,
  DeleteTemplateHandler,
];

/**
 * Query handlers for mail module
 * Handle read-only operations
 */
const QueryHandlers = [
  GetMailStatusHandler,
  GetMailsByStatusHandler,
  GetTemplateHandler,
  GetTemplateByNameHandler,
  GetAllTemplatesHandler,
  GetActiveTemplatesHandler,
];

/**
 * Event handlers for mail module
 * React to domain events from other modules
 */
const EventHandlers = [UserCreatedEmailEventHandler];

/**
 * Mail Module
 *
 * Implements DDD, CQRS architecture for flexible email sending
 * with Handlebars templates via nodemailer and BullMQ queue.
 *
 * @description
 * Features:
 * - Email sending with Handlebars templates from PostgreSQL
 * - Asynchronous processing via BullMQ queue
 * - Email status tracking
 * - Failed email retry (up to 5 attempts)
 * - Email metadata storage in PostgreSQL
 *
 * @example
 * ```typescript
 * // Send email
 * const mailId = await this.commandBus.execute(
 *   new SendMailCommand({
 *     to: 'user@example.com',
 *     subject: 'Welcome!',
 *     template: MailTemplateType.WELCOME,
 *     context: { name: 'John' }
 *   })
 * );
 *
 * // Check status
 * const status = await this.queryBus.execute(
 *   new GetMailStatusQuery(mailId)
 * );
 * ```
 */
@Global()
@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({ name: 'mail' }),
    MailerModule.forRootAsync({
      useFactory: MailerModuleOptions,
      inject: [ConfigService],
    }),
  ],
  providers: [
    {
      provide: MailRepository,
      useClass: MailRepositoryDrizzle,
    },
    {
      provide: TemplateRepository,
      useClass: TemplateRepositoryDrizzle,
    },
    MailProcessor,
    MailService,
    TemplateService,
    TemplateSeedService,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [MailRepository, TemplateRepository, MailService, TemplateService, TemplateSeedService],
})
export class MailModule {}
