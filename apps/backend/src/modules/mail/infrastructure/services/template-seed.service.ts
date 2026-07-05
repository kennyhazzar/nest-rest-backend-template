import { Injectable, Logger } from '@nestjs/common';
import { MailTemplateType } from '../../domain/enums/mail-template-type.enum';
import { TemplateRepository } from '../../domain/repositories/template.repository';

/**
 * Template Seed Service
 *
 * Seeds default email templates into the database on application startup.
 * This ensures that all required email templates exist in the database.
 *
 * Note: This is useful for template/boilerplate projects to have working examples.
 * In production, you might want to use migrations or separate seeding scripts.
 */
@Injectable()
export class TemplateSeedService {
  private readonly logger = new Logger(TemplateSeedService.name);

  constructor(private readonly templateRepo: TemplateRepository) {}

  async seedTemplates() {
    const templates = [
      {
        name: MailTemplateType.WELCOME,
        subject: 'Welcome to {{appName}}!',
        description: 'Welcome email sent to new users after registration',
        isActive: true,
      },
      {
        name: MailTemplateType.PASSWORD_RESET,
        subject: 'Reset your password - {{appName}}',
        description: 'Password reset email with reset link',
        isActive: true,
      },
      {
        name: MailTemplateType.CONTACT_FORM,
        subject: 'New contact form submission - {{appName}}',
        description: 'Contact form submission notification',
        isActive: true,
      },
      {
        name: MailTemplateType.MAGIC_LINK_LOGIN,
        subject: 'Your magic login link - {{appName}}',
        description: 'Magic link for passwordless authentication',
        isActive: true,
      },
      {
        name: MailTemplateType.OAUTH_FIRST_LOGIN,
        subject: 'Welcome to {{appName}}!',
        description: 'Welcome email for first-time OAuth login',
        isActive: true,
      },
      {
        name: MailTemplateType.OAUTH_ACCOUNT_LINKED,
        subject: 'OAuth account linked - {{appName}}',
        description: 'Notification when OAuth provider is linked to existing account',
        isActive: true,
      },
      {
        name: MailTemplateType.NOTIFICATION,
        subject: '{{title}}',
        description: 'Generic in-app notification dispatched via email',
        isActive: true,
      },
    ];

    for (const template of templates) {
      const exists = await this.templateRepo.findByName(template.name);

      if (!exists) {
        await this.templateRepo.create(template);
        this.logger.log(`Seeded email template: ${template.name}`);
      }
    }

    this.logger.log('Email templates seeding completed');
  }
}
