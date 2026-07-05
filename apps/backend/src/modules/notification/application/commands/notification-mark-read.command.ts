import { Command } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';

export class NotificationMarkReadCommand extends Command<boolean> {
  constructor(
    public readonly userId: IdType,
    public readonly notificationId: IdType,
  ) {
    super();
  }
}
