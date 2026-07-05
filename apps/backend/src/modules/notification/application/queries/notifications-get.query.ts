import { Query } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';
import { NotificationsDto } from '../../presentation/dtos/notification.dto';

export interface NotificationQueryOptions {
  isRead?: boolean;
  page?: number;
  per_page?: number;
}

export class NotificationsGetQuery extends Query<NotificationsDto> {
  constructor(
    public readonly userId: IdType,
    public readonly options?: NotificationQueryOptions,
  ) {
    super();
  }
}
