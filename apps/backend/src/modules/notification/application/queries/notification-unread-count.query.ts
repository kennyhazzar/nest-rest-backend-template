import { Query } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';

export class NotificationUnreadCountQuery extends Query<number> {
  constructor(public readonly userId: IdType) {
    super();
  }
}
