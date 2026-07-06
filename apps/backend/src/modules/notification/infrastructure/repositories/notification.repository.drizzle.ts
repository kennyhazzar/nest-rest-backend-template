import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import { notification } from '@/common/drizzle/schema';
import * as schema from '@/common/drizzle/schema';
import { IdType } from '@/interfaces/id.type';
import { NotificationType } from '@/enums/notification-type.enum';
import { Notification, Notifications } from '../../domain/entities/notification.entity';
import { NotificationFilterOptions, NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';

type NotificationRow = typeof notification.$inferSelect;

@Injectable()
export class NotificationRepositoryDrizzle extends NotificationRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  async create(value: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Notification> {
    const [row] = await this.db
      .insert(notification)
      .values({
        userId: value.userId,
        title: value.title,
        content: value.content,
        type: value.type,
        channel: value.channel,
        status: value.status,
        attempts: value.attempts,
        nextAttemptAt: value.nextAttemptAt,
        sentAt: value.sentAt,
        failedAt: value.failedAt,
        errorMessage: value.errorMessage,
        isRead: value.isRead,
        metadata: value.metadata,
      })
      .returning();
    return this.toDomain(row);
  }

  async findById(id: IdType): Promise<Notification | null> {
    const [row] = await this.db
      .select()
      .from(notification)
      .where(and(eq(notification.id, id), isNull(notification.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByIdAndUserId(id: IdType, userId: IdType): Promise<Notification | null> {
    const [row] = await this.db
      .select()
      .from(notification)
      .where(and(eq(notification.id, id), eq(notification.userId, userId), isNull(notification.deletedAt)))
      .limit(1);
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: IdType, options?: NotificationFilterOptions): Promise<Notifications> {
    const conditions = [eq(notification.userId, userId), isNull(notification.deletedAt)];
    conditions.push(eq(notification.channel, options?.channel ?? NotificationChannel.IN_APP));
    if (options?.isRead !== undefined) conditions.push(eq(notification.isRead, options.isRead));
    const where = and(...conditions);

    // Data, total count, and unread count are independent reads against the same filter —
    // run them concurrently instead of three serialized round trips.
    const [rows, totalCountResult, unreadCount] = await Promise.all([
      this.db
        .select()
        .from(notification)
        .where(where)
        .orderBy(desc(notification.createdAt))
        .limit(options?.take ?? 20)
        .offset(options?.skip ?? 0),
      this.db.select({ value: count() }).from(notification).where(where),
      this.getUnreadCount(userId),
    ]);
    const totalCount = totalCountResult[0].value;

    return Notifications.create(
      rows.map((row) => this.toDomain(row)),
      totalCount,
      unreadCount,
    );
  }

  async findPendingForDispatch(limit: number, now: Date = new Date()): Promise<Notification[]> {
    const rows = await this.db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.status, NotificationDeliveryStatus.PENDING),
          isNull(notification.deletedAt),
          or(isNull(notification.nextAttemptAt), lte(notification.nextAttemptAt, now)),
        ),
      )
      .orderBy(notification.createdAt)
      .limit(limit);
    return rows.map((row) => this.toDomain(row));
  }

  async getUnreadCount(userId: IdType): Promise<number> {
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          eq(notification.channel, NotificationChannel.IN_APP),
          eq(notification.isRead, false),
          isNull(notification.deletedAt),
        ),
      );
    return value;
  }

  async markDispatchSent(id: IdType, sentAt: Date = new Date()): Promise<boolean> {
    const rows = await this.db
      .update(notification)
      .set({
        status: NotificationDeliveryStatus.SENT,
        sentAt,
        failedAt: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(eq(notification.id, id), isNull(notification.deletedAt)))
      .returning({ id: notification.id });
    return rows.length > 0;
  }

  async markDispatchFailed(id: IdType, errorMessage: string, nextAttemptAt: Date | null): Promise<boolean> {
    const status = nextAttemptAt ? NotificationDeliveryStatus.PENDING : NotificationDeliveryStatus.FAILED;
    const rows = await this.db
      .update(notification)
      .set({
        status,
        attempts: sql`${notification.attempts} + 1`,
        nextAttemptAt,
        failedAt: status === NotificationDeliveryStatus.FAILED ? new Date() : null,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(and(eq(notification.id, id), isNull(notification.deletedAt)))
      .returning({ id: notification.id });
    return rows.length > 0;
  }

  async markAsRead(id: IdType, userId: IdType): Promise<boolean> {
    const rows = await this.db
      .update(notification)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notification.id, id), eq(notification.userId, userId), isNull(notification.deletedAt)))
      .returning({ id: notification.id });
    return rows.length > 0;
  }

  async markAllAsRead(userId: IdType): Promise<number> {
    const rows = await this.db
      .update(notification)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notification.userId, userId), eq(notification.isRead, false), isNull(notification.deletedAt)))
      .returning({ id: notification.id });
    return rows.length;
  }

  async delete(id: IdType, userId: IdType): Promise<boolean> {
    const rows = await this.db
      .update(notification)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notification.id, id), eq(notification.userId, userId), isNull(notification.deletedAt)))
      .returning({ id: notification.id });
    return rows.length > 0;
  }

  private toDomain(row: NotificationRow): Notification {
    return new Notification({
      ...row,
      type: (row.type ?? NotificationType.INFO) as NotificationType,
      channel: (row.channel ?? NotificationChannel.IN_APP) as NotificationChannel,
      status: (row.status ?? NotificationDeliveryStatus.PENDING) as NotificationDeliveryStatus,
      attempts: row.attempts ?? 0,
      isRead: row.isRead ?? false,
      metadata: row.metadata as Record<string, any> | null,
    });
  }
}
