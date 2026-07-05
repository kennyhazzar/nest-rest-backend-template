import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';

import { NotificationType } from '@/enums/notification-type.enum';
import { UserGetByIdQuery } from '@/modules/users/application/queries/user-get-by-id.query';
import { NotificationCreateCommand } from '../commands/notification-create.command';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationMapper } from '../../presentation/mappers/notification.mapper';
import { NotificationDto } from '../../presentation/dtos/notification.dto';
import { NotificationDispatchService } from '../../infrastructure/services/notification-dispatch.service';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';
import { Notification } from '../../domain/entities';

@CommandHandler(NotificationCreateCommand)
export class NotificationCreateHandler implements ICommandHandler<NotificationCreateCommand, NotificationDto> {
  private readonly logger = new Logger(NotificationCreateHandler.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly dispatchService: NotificationDispatchService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: NotificationCreateCommand): Promise<NotificationDto> {
    const { payload } = command;

    await this.queryBus.execute(new UserGetByIdQuery(payload.userId));

    const channels = payload.channels?.length
      ? [...new Set(payload.channels)]
      : [NotificationChannel.IN_APP, NotificationChannel.EMAIL];

    const notifications: Notification[] = [];
    for (const channel of channels) {
      const isInApp = channel === NotificationChannel.IN_APP;
      const notification = await this.notificationRepository.create({
        userId: payload.userId,
        title: payload.title,
        content: payload.content,
        type: payload.type ?? NotificationType.INFO,
        channel,
        status: isInApp ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.PENDING,
        attempts: 0,
        sentAt: isInApp ? new Date() : null,
        isRead: false,
        metadata: payload.metadata,
      });
      notifications.push(notification);

      if (!isInApp) {
        this.dispatchService
          .enqueue({
            notificationId: notification.id,
            userId: notification.userId,
            title: notification.title,
            content: notification.content,
            type: notification.type,
            channel: notification.channel,
            metadata: notification.metadata,
          })
          .catch((err) => {
            this.logger.error(`Failed to enqueue dispatch for notification ${notification.id}: ${err.message}`);
          });
      }
    }

    return NotificationMapper.toDto(
      notifications.find((notification) => notification.channel === NotificationChannel.IN_APP) ?? notifications[0],
    );
  }
}
