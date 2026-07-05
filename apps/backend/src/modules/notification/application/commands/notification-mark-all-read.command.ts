import { Command } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';

export class NotificationMarkAllReadCommand extends Command<number> {
  constructor(public readonly userId: IdType) {
    super();
  }
}
