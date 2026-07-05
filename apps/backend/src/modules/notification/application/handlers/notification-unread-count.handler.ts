import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotificationUnreadCountQuery } from '../queries/notification-unread-count.query';
import { NotificationRepository } from '../../domain/repositories/notification.repository';

@QueryHandler(NotificationUnreadCountQuery)
export class NotificationUnreadCountHandler implements IQueryHandler<NotificationUnreadCountQuery, number> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: NotificationUnreadCountQuery): Promise<number> {
    return this.notificationRepository.getUnreadCount(query.userId);
  }
}
