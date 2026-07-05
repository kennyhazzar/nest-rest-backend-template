import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';

import { NotificationDeleteCommand } from '../commands/notification-delete.command';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@CommandHandler(NotificationDeleteCommand)
export class NotificationDeleteHandler implements ICommandHandler<NotificationDeleteCommand, boolean> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(command: NotificationDeleteCommand): Promise<boolean> {
    const { userId, notificationId } = command;

    const notification = await this.notificationRepository.findByIdAndUserId(notificationId, userId);
    if (!notification) {
      throw new NotFoundException('notification.notFound');
    }

    return this.notificationRepository.delete(notificationId, userId);
  }
}
