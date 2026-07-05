import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IdType } from '@/interfaces/id.type';
import { NotificationType } from '@/enums/notification-type.enum';
import { Paginated } from '@/common/Paginated';

export class NotificationDto {
  @ApiProperty({ description: 'Unique notification identifier', format: 'uuid' })
  id!: IdType;

  @ApiProperty({ description: 'UUID of the user who owns this notification', format: 'uuid' })
  userId!: IdType;

  @ApiProperty({ description: 'Notification title', example: 'Disk space low' })
  title!: string;

  @ApiProperty({
    description: 'Full notification message body',
    example: 'Disk usage on "server-1" exceeded 90% for 5 minutes.',
  })
  content!: string;

  @ApiProperty({ description: 'Notification category', enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ description: 'Whether the user has already read this notification' })
  isRead!: boolean;

  @ApiPropertyOptional({ description: 'JSON-encoded context data attached to the notification', nullable: true })
  metadata?: string;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt!: Date;
}

export class NotificationsDto extends Paginated(NotificationDto) {
  @ApiProperty({ description: 'Total number of unread notifications for the current user' })
  unreadCount!: number;
}
