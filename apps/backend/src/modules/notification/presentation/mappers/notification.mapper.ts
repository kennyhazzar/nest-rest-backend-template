import { Notification } from '../../domain/entities/notification.entity';
import { NotificationDto } from '../dtos/notification.dto';

export class NotificationMapper {
  static toDto(notification: Notification): NotificationDto {
    const dto = new NotificationDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.title = notification.title;
    dto.content = notification.content;
    dto.type = notification.type;
    dto.isRead = notification.isRead;
    dto.metadata = notification.metadata ? JSON.stringify(notification.metadata) : undefined;
    dto.createdAt = notification.createdAt!;
    return dto;
  }
}
