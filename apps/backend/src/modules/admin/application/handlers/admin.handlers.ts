import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { and, count, eq, isNull, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { buildPaginated, toSqlPagination } from '@/common/Paginated';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { SystemSettingUpdateCommand, WriteAccessLogCommand } from '../commands/admin.commands';
import { AccessLogsQuery, DashboardQuery, SystemSettingsQuery } from '../queries/admin.queries';

@QueryHandler(DashboardQuery)
export class DashboardHandler implements IQueryHandler<DashboardQuery> {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {}

  async execute() {
    const [[{ totalUsers }], [{ activeUsers }], [{ totalRoles }], [{ unreadNotifications }], [{ queuedMails }]] =
      await Promise.all([
        this.db.select({ totalUsers: count() }).from(schema.user).where(isNull(schema.user.deletedAt)),
        this.db
          .select({ activeUsers: count() })
          .from(schema.user)
          .where(and(isNull(schema.user.deletedAt), eq(schema.user.blocked, false))),
        this.db.select({ totalRoles: count() }).from(schema.userRole).where(isNull(schema.userRole.deletedAt)),
        this.db
          .select({ unreadNotifications: count() })
          .from(schema.notification)
          .where(and(isNull(schema.notification.deletedAt), eq(schema.notification.isRead, false))),
        this.db
          .select({ queuedMails: count() })
          .from(schema.mail)
          .where(and(isNull(schema.mail.deletedAt), eq(schema.mail.status, 'pending'))),
      ]);

    return {
      totalUsers: Number(totalUsers),
      activeUsers: Number(activeUsers),
      totalRoles: Number(totalRoles),
      unreadNotifications: Number(unreadNotifications),
      queuedMails: Number(queuedMails),
    };
  }
}

@QueryHandler(AccessLogsQuery)
export class AccessLogsHandler implements IQueryHandler<AccessLogsQuery> {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {}

  async execute({ filter }: AccessLogsQuery) {
    const conditions: SQL[] = [];
    if (filter.action) conditions.push(eq(schema.accessLog.action, filter.action));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const page = filter.page ?? 1;
    const perPage = filter.per_page ?? 20;
    const { limit, offset } = toSqlPagination(page, perPage);

    const [items, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(schema.accessLog)
        .where(where)
        .orderBy(schema.accessLog.createdAt)
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(schema.accessLog).where(where),
    ]);

    return buildPaginated(items, Number(total), page, perPage);
  }
}

@QueryHandler(SystemSettingsQuery)
export class SystemSettingsHandler implements IQueryHandler<SystemSettingsQuery> {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {}

  execute() {
    return this.db.select().from(schema.systemSetting);
  }
}

@CommandHandler(SystemSettingUpdateCommand)
export class SystemSettingUpdateHandler implements ICommandHandler<SystemSettingUpdateCommand> {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {}

  async execute({ key, value }: SystemSettingUpdateCommand) {
    const [row] = await this.db
      .insert(schema.systemSetting)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.systemSetting.key, set: { value, updatedAt: new Date() } })
      .returning();
    return row;
  }
}

@CommandHandler(WriteAccessLogCommand)
export class WriteAccessLogHandler implements ICommandHandler<WriteAccessLogCommand> {
  constructor(@Inject(DRIZZLE_CONNECTION) private readonly db: NodePgDatabase<typeof schema>) {}

  async execute({ action, payload }: WriteAccessLogCommand): Promise<void> {
    await this.db.insert(schema.accessLog).values({
      action,
      userId: payload.userId,
      email: payload.email,
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
      details: payload.details ? JSON.stringify(payload.details) : undefined,
    });
  }
}

export const AdminQueryHandlers = [DashboardHandler, AccessLogsHandler, SystemSettingsHandler];
export const AdminCommandHandlers = [SystemSettingUpdateHandler, WriteAccessLogHandler];
