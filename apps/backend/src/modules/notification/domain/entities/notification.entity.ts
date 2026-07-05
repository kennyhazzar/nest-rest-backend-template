import { IdType } from '@/interfaces/id.type';
import { NotificationType } from '@/enums/notification-type.enum';
import { NotificationChannel, NotificationDeliveryStatus } from '../enums';

export interface NotificationData {
  id?: IdType;
  userId: IdType;
  title: string;
  content: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempts: number;
  nextAttemptAt?: Date | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
  isRead: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export class Notification implements NotificationData {
  id!: IdType;
  userId!: IdType;
  title!: string;
  content!: string;
  type!: NotificationType;
  channel!: NotificationChannel;
  status!: NotificationDeliveryStatus;
  attempts!: number;
  nextAttemptAt?: Date | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
  errorMessage?: string | null;
  isRead!: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  constructor(entity: NotificationData) {
    Object.assign(this, entity);
  }

  static create(entity: Omit<NotificationData, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Notification {
    return new Notification({
      ...entity,
      id: undefined,
      channel: entity.channel ?? NotificationChannel.IN_APP,
      status: entity.status ?? NotificationDeliveryStatus.PENDING,
      attempts: entity.attempts ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
  }
}

export class Notifications extends Array<Notification> {
  totalCount: number = 0;
  unreadCount: number = 0;

  static create(notifications: Notification[], totalCount?: number, unreadCount?: number): Notifications {
    const aggregate = new Notifications();
    aggregate.push(...notifications);
    aggregate.totalCount = totalCount ?? notifications.length;
    aggregate.unreadCount = unreadCount ?? notifications.filter((n) => !n.isRead).length;
    return aggregate;
  }
}
