import { IdType } from '@/interfaces/id.type';
import { NotificationChannel } from '../enums';
import { Notification, Notifications } from '../entities/notification.entity';

export interface NotificationFilterOptions {
  isRead?: boolean;
  channel?: NotificationChannel;
  take?: number;
  skip?: number;
}

export abstract class NotificationRepository {
  abstract create(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<Notification>;
  abstract findById(id: IdType): Promise<Notification | null>;
  abstract findByIdAndUserId(id: IdType, userId: IdType): Promise<Notification | null>;
  abstract findByUserId(userId: IdType, options?: NotificationFilterOptions): Promise<Notifications>;
  abstract findPendingForDispatch(limit: number, now?: Date): Promise<Notification[]>;
  abstract getUnreadCount(userId: IdType): Promise<number>;
  abstract markDispatchSent(id: IdType, sentAt?: Date): Promise<boolean>;
  abstract markDispatchFailed(id: IdType, errorMessage: string, nextAttemptAt: Date | null): Promise<boolean>;
  abstract markAsRead(id: IdType, userId: IdType): Promise<boolean>;
  abstract markAllAsRead(userId: IdType): Promise<number>;
  abstract delete(id: IdType, userId: IdType): Promise<boolean>;
}
