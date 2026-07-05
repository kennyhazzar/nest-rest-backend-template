import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { UserCreatedEvent } from '@/modules/users/application/events';
import { MailRepository } from '../../../domain/repositories/mail.repository';
import { MailService } from '../../../infrastructure/services/mail.service';
import { Mail } from '../../../domain/entities/mail.entity';
import { MailTemplateType } from '../../../domain/enums/mail-template-type.enum';

/**
 * Event Handler for UserCreatedEvent - Email
 *
 * Listens to UserCreatedEvent and sends a welcome email to the new user.
 * This demonstrates Event-Driven Architecture with multiple handlers for one event.
 *
 * Flow:
 * UserCreatedEvent → [UserCreatedEventHandler (notification), UserCreatedEmailEventHandler (email)]
 *
 * Key features:
 * - Multiple handlers for same event (1-to-many pattern)
 * - Decoupled modules (users → mail via events)
 * - Uses existing Mail infrastructure (repository + BullMQ queue)
 * - Graceful error handling (doesn't break user creation if email fails)
 *
 * Note:
 * For this template to work, you need to create the 'welcome' email template in the database.
 * In production, you would seed email templates. For development, you can skip email sending
 * or create templates manually via the REST API.
 */
@EventsHandler(UserCreatedEvent)
export class UserCreatedEmailEventHandler implements IEventHandler<UserCreatedEvent> {
  private readonly logger = new Logger(UserCreatedEmailEventHandler.name);

  constructor(
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const { email, name, surname } = event;

    try {
      const fullName = surname ? `${name} ${surname}` : name;
      const appName = this.configService.get<string>('app.name', 'App');

      // Create welcome email
      const mail = Mail.create({
        to: email,
        subject: `Welcome to ${appName}!`,
        template: MailTemplateType.WELCOME,
        context: {
          userName: fullName,
          appName,
          loginUrl: this.configService.get<string>('app.frontendUrl', 'http://localhost:3000'),
          year: new Date().getFullYear(),
        },
      });

      // Save to database and add to BullMQ queue
      const savedMail = await this.mailRepository.create(mail);
      await this.mailService.addToQueue(savedMail);

      this.logger.log(`Welcome email queued for user: ${email}`);
    } catch (error) {
      // IMPORTANT: Event handlers should NOT throw errors
      // If email fails, user creation should still succeed
      this.logger.warn(
        `Failed to send welcome email for user ${email}. ` +
          `This is expected in development if email templates are not seeded. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      // In production, you might want to:
      // - Send to dead letter queue
      // - Create a failed email record
      // - Alert monitoring system
      // But for this template, we just log and continue
    }
  }
}
