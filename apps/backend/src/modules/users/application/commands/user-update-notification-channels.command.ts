import { Command } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { NotificationChannel } from '@/modules/notification/domain/enums';

export class UserUpdateNotificationChannelsCommand extends Command<void> {
  constructor(
    public readonly userId: IdType,
    public readonly channels: NotificationChannel[],
  ) {
    super();
  }
}
