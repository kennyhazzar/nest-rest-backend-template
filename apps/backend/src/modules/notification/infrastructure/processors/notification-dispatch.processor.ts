import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { UserRepository } from '@/modules/users/domain/repositories';
import { SendMailCommand } from '@/modules/mail/application/commands/send-mail.command';
import { MailTemplateType } from '@/modules/mail/domain/enums/mail-template-type.enum';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';
import { NotificationDispatchJobData } from '../services/notification-dispatch.service';

@Processor('notifications')
export class NotificationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDispatchProcessor.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly commandBus: CommandBus,
  ) {
    super();
  }

  async process(job: Job<NotificationDispatchJobData>): Promise<void> {
    const { notificationId, channel } = job.data;
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found, skipping dispatch`);
      return;
    }

    if (notification.status !== NotificationDeliveryStatus.PENDING) {
      this.logger.debug(`Notification ${notificationId} is ${notification.status}, skipping dispatch`);
      return;
    }

    try {
      if (channel === NotificationChannel.IN_APP) {
        await this.notificationRepository.markDispatchSent(notificationId);
        return;
      }

      if (channel !== NotificationChannel.EMAIL) {
        await this.notificationRepository.markDispatchFailed(
          notificationId,
          `Unsupported notification channel: ${channel}`,
          null,
        );
        return;
      }

      await this.dispatchEmail(job.data);
      await this.notificationRepository.markDispatchSent(notificationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const nextAttemptAt = this.getNextAttemptAt(job);
      await this.notificationRepository.markDispatchFailed(notificationId, message, nextAttemptAt);
      if (nextAttemptAt) throw error;
    }
  }

  private async dispatchEmail(data: NotificationDispatchJobData): Promise<void> {
    const { notificationId, userId, title, content } = data;
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    await this.commandBus.execute(
      new SendMailCommand({
        to: user.email,
        subject: title,
        template: MailTemplateType.NOTIFICATION,
        context: { title, content },
        notificationId: String(notificationId),
      }),
    );
  }

  private getNextAttemptAt(job: Job<NotificationDispatchJobData>): Date | null {
    const maxAttempts = job.opts.attempts ?? 1;
    const nextAttemptNumber = job.attemptsMade + 1;
    if (nextAttemptNumber >= maxAttempts) return null;

    const delayMs = Math.min(60_000, 1000 * 10 ** Math.max(0, nextAttemptNumber - 1));
    return new Date(Date.now() + delayMs);
  }
}
