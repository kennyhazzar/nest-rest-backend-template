import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationDispatchService } from './notification-dispatch.service';

const DISPATCH_BATCH_LIMIT = 100;

@Injectable()
export class NotificationPendingDispatcherService {
  private readonly logger = new Logger(NotificationPendingDispatcherService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly dispatchService: NotificationDispatchService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async dispatchPending(): Promise<void> {
    const pending = await this.notificationRepository.findPendingForDispatch(DISPATCH_BATCH_LIMIT);
    if (!pending.length) return;

    this.logger.debug(`notification-dispatcher: enqueue ${pending.length} pending notifications`);
    for (const notification of pending) {
      await this.dispatchService.enqueue({
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        channel: notification.channel,
        metadata: notification.metadata,
      });
    }
  }
}
