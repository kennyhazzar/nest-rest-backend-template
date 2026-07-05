import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import { notificationTemplate } from '@/common/drizzle/schema';
import * as schema from '@/common/drizzle/schema';
import { NotificationTemplateType } from '@/modules/notification/domain/enums';

@Injectable()
export class NotificationTemplateSeedService {
  private readonly logger = new Logger(NotificationTemplateSeedService.name);

  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private getTemplateDefaults(templateType: NotificationTemplateType): { subject: string; content: string } {
    return {
      [NotificationTemplateType.WELCOME]: {
        subject: 'Welcome to the platform!',
        content: 'Hello {userName}! Welcome to our platform.',
      },
      [NotificationTemplateType.PASSWORD_CHANGED]: {
        subject: 'Your password has been changed',
        content: 'Hello {userName}, your password was successfully changed on {date}.',
      },
      [NotificationTemplateType.PROFILE_UPDATED]: {
        subject: 'Profile updated successfully',
        content: 'Hello {userName}, your profile information has been updated successfully.',
      },
      [NotificationTemplateType.SYSTEM_MAINTENANCE]: {
        subject: 'Scheduled system maintenance',
        content: 'Scheduled maintenance on {date}. Expected downtime: {duration}.',
      },
      [NotificationTemplateType.SYSTEM]: {
        subject: 'System notification',
        content: '{content}',
      },
      [NotificationTemplateType.FEATURE_ANNOUNCEMENT]: {
        subject: 'New feature available: {featureName}',
        content: '{description}',
      },
      [NotificationTemplateType.NEW_LOGIN]: {
        subject: 'New login to your account',
        content: 'New login detected on {date} from {location}. Device: {device}.',
      },
      [NotificationTemplateType.SECURITY_ALERT]: {
        subject: 'Security alert',
        content: '{details}',
      },
    }[templateType];
  }

  async seedIfEmpty(): Promise<void> {
    for (const templateType of Object.values(NotificationTemplateType)) {
      const [existing] = await this.db
        .select({ id: notificationTemplate.id })
        .from(notificationTemplate)
        .where(eq(notificationTemplate.name, templateType))
        .limit(1);
      if (!existing) {
        const defaults = this.getTemplateDefaults(templateType);
        await this.db.insert(notificationTemplate).values({
          name: templateType,
          subject: defaults.subject,
          content: defaults.content,
          isActive: true,
        });
        this.logger.log(`Created notification template: ${templateType}`);
      }
    }
  }

  async clear(): Promise<void> {
    await this.db.delete(notificationTemplate);
  }
}
