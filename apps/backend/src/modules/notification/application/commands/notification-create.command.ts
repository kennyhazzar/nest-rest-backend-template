import { Command } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';
import { NotificationType } from '@/enums/notification-type.enum';
import { NotificationDto } from '../../presentation/dtos/notification.dto';
import { NotificationChannel } from '../../domain/enums';

export interface NotificationCreatePayload {
  userId: IdType;
  title: string;
  content: string;
  type?: NotificationType;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
}

export class NotificationCreateCommand extends Command<NotificationDto> {
  constructor(public readonly payload: NotificationCreatePayload) {
    super();
  }
}
