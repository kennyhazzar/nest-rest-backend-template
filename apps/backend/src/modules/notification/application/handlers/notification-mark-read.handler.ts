import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';

import { NotificationMarkReadCommand } from '../commands/notification-mark-read.command';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@CommandHandler(NotificationMarkReadCommand)
export class NotificationMarkReadHandler implements ICommandHandler<NotificationMarkReadCommand, boolean> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(command: NotificationMarkReadCommand): Promise<boolean> {
    const { userId, notificationId } = command;

    const notification = await this.notificationRepository.findByIdAndUserId(notificationId, userId);
    if (!notification) {
      throw new NotFoundException('notification.notFound');
    }

    return this.notificationRepository.markAsRead(notificationId, userId);
  }
}
