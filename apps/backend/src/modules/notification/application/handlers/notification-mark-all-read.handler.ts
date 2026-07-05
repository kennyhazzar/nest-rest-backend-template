import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotificationMarkAllReadCommand } from '../commands/notification-mark-all-read.command';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@CommandHandler(NotificationMarkAllReadCommand)
export class NotificationMarkAllReadHandler implements ICommandHandler<NotificationMarkAllReadCommand, number> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(command: NotificationMarkAllReadCommand): Promise<number> {
    return this.notificationRepository.markAllAsRead(command.userId);
  }
}
