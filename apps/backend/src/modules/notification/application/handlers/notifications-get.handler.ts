import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { buildPaginated, toSqlPagination } from '@/common/Paginated';
import { NotificationsGetQuery } from '../queries/notifications-get.query';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationMapper } from '../../presentation/mappers/notification.mapper';
import { NotificationsDto } from '../../presentation/dtos/notification.dto';

@QueryHandler(NotificationsGetQuery)
export class NotificationsGetHandler implements IQueryHandler<NotificationsGetQuery, NotificationsDto> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: NotificationsGetQuery): Promise<NotificationsDto> {
    const page = query.options?.page ?? 1;
    const perPage = query.options?.per_page ?? 20;
    const notifications = await this.notificationRepository.findByUserId(query.userId, {
      isRead: query.options?.isRead,
      ...toSqlPagination(page, perPage),
    });
    const paginated = buildPaginated(
      notifications.map(NotificationMapper.toDto),
      notifications.totalCount,
      page,
      perPage,
    );
    return { ...paginated, unreadCount: notifications.unreadCount };
  }
}
