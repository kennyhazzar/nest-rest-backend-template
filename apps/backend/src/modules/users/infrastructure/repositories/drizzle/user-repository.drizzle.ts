import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, isNull, sql, SQL } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { user as userTable, userRole as userRoleTable } from '@/common/drizzle/schema';
import { Gender } from '@/enums/gender.enum';
import { Theme } from '@/enums/theme.enum';
import { RoleType } from '@/enums/role-type.enum';
import { IdType } from '@/interfaces/id.type';
import { NotificationChannel } from '@/modules/notification/domain/enums';
import { UserRepository } from '../../../domain/repositories/user.repository';
import {
  UserFilter,
  UserFindOneOptions,
  UserUpdatePayload,
  UpdateAffected,
} from '../../../domain/repositories/user.filter';
import { User, Users } from '../../../domain/entities';
import { IUserRole } from '../../../domain/interfaces';

type UserRow = typeof userTable.$inferSelect;
type UserRoleRow = typeof userRoleTable.$inferSelect;

@Injectable()
export class UserRepositoryDrizzle extends UserRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  private toRole(row: UserRoleRow): IUserRole {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      type: row.type as RoleType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private toUser(row: UserRow, roleRow?: UserRoleRow | null): User {
    const u = new User();
    u.id = row.id;
    u.email = row.email;
    u.forgotConfirmKey = row.forgotConfirmKey ?? null;
    u.emailConfirmKey = row.emailConfirmKey ?? null;
    u.verified = row.verified ?? false;
    u.password = row.password ?? undefined;
    u.name = row.name;
    u.surname = row.surname;
    u.middleName = row.middleName ?? undefined;
    u.phone = row.phone ?? undefined;
    u.roleId = row.roleId;
    u.gender = (row.gender ?? 'male') as Gender;
    u.birthday = row.birthday ?? undefined;
    u.blocked = row.blocked ?? false;
    u.failedLoginAttempts = row.failedLoginAttempts ?? 0;
    u.failedLoginWindowStartedAt = row.failedLoginWindowStartedAt ?? null;
    u.lockedUntil = row.lockedUntil ?? null;
    u.tokenVersion = row.tokenVersion ?? 1;
    u.country = row.country ?? 'RU';
    u.language = row.language ?? 'ru';
    u.locale = row.locale ?? 'ru_RU';
    u.theme = (row.theme ?? 'light') as Theme;
    u.notificationChannels = (row.notificationChannels as NotificationChannel[] | null) ?? null;
    u.createdAt = row.createdAt;
    u.updatedAt = row.updatedAt;
    u.deletedAt = row.deletedAt;
    if (roleRow) u.role = this.toRole(roleRow);
    return u;
  }

  private buildWhere(filter?: UserFilter): SQL | undefined {
    const conditions: SQL[] = [];
    if (!filter?.includeDeleted) conditions.push(isNull(userTable.deletedAt));
    if (filter?.email) conditions.push(eq(userTable.email, filter.email));
    if (filter?.roleId) conditions.push(eq(userTable.roleId, filter.roleId));
    if (filter?.ids?.length) conditions.push(inArray(userTable.id, filter.ids));
    if (filter?.blocked !== undefined) conditions.push(eq(userTable.blocked, filter.blocked));
    if (filter?.verified !== undefined) conditions.push(eq(userTable.verified, filter.verified));
    return conditions.length ? and(...conditions) : undefined;
  }

  async find(filter?: UserFilter): Promise<Users> {
    const where = this.buildWhere(filter);

    const baseQuery = this.db
      .select({ user: userTable, role: userRoleTable })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(where);

    const rows = await (filter?.limit !== undefined
      ? baseQuery.limit(filter.limit).offset(filter.offset ?? 0)
      : baseQuery);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTable)
      .where(where);

    const users = new Users();
    users.push(...rows.map((r) => this.toUser(r.user, r.role)));
    users.totalCount = count;
    return users;
  }

  async findOne(filter: UserFilter, options?: UserFindOneOptions): Promise<User | null> {
    const conditions: SQL[] = [];
    if (!options?.includeDeleted) conditions.push(isNull(userTable.deletedAt));
    if (filter.email) conditions.push(eq(userTable.email, filter.email));
    if (filter.roleId) conditions.push(eq(userTable.roleId, filter.roleId));

    const rows = await this.db
      .select({ user: userTable, role: userRoleTable })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(...conditions))
      .limit(1);

    return rows[0] ? this.toUser(rows[0].user, rows[0].role) : null;
  }

  async findById(id: string, options?: UserFindOneOptions): Promise<User | null> {
    const conditions: SQL[] = [eq(userTable.id, id)];
    if (!options?.includeDeleted) conditions.push(isNull(userTable.deletedAt));

    const rows = await this.db
      .select({ user: userTable, role: userRoleTable })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(...conditions))
      .limit(1);

    return rows[0] ? this.toUser(rows[0].user, rows[0].role) : null;
  }

  async findByIds(ids: string[]): Promise<Users> {
    const rows = await this.db
      .select({ user: userTable, role: userRoleTable })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(inArray(userTable.id, ids), isNull(userTable.deletedAt)));

    const users = new Users();
    users.push(...rows.map((r) => this.toUser(r.user, r.role)));
    users.totalCount = users.length;
    return users;
  }

  async findByEmail(email: string, options?: UserFindOneOptions): Promise<User | null> {
    const conditions: SQL[] = [eq(userTable.email, email)];
    if (!options?.includeDeleted) conditions.push(isNull(userTable.deletedAt));
    const where = and(...conditions);

    if (options?.includePassword) {
      const rows = await this.db
        .select({ user: userTable, role: userRoleTable })
        .from(userTable)
        .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
        .where(where)
        .limit(1);
      return rows[0] ? this.toUser(rows[0].user, rows[0].role) : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...userWithoutPassword } = userTable;
    const rows = await this.db
      .select({ user: userWithoutPassword, role: userRoleTable })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(where)
      .limit(1);

    return rows[0] ? this.toUser(rows[0].user, rows[0].role) : null;
  }

  async create(domainUser: User): Promise<User> {
    const [inserted] = await this.db
      .insert(userTable)
      .values({
        id: domainUser.id,
        email: domainUser.email,
        forgotConfirmKey: domainUser.forgotConfirmKey,
        emailConfirmKey: domainUser.emailConfirmKey,
        verified: domainUser.verified,
        password: domainUser.password,
        name: domainUser.name,
        surname: domainUser.surname,
        middleName: domainUser.middleName,
        phone: domainUser.phone,
        roleId: domainUser.roleId,
        gender: domainUser.gender as UserRow['gender'],
        birthday: domainUser.birthday,
        blocked: domainUser.blocked,
        failedLoginAttempts: domainUser.failedLoginAttempts,
        failedLoginWindowStartedAt: domainUser.failedLoginWindowStartedAt,
        lockedUntil: domainUser.lockedUntil,
        tokenVersion: domainUser.tokenVersion,
        country: domainUser.country,
        language: domainUser.language,
        locale: domainUser.locale,
        theme: domainUser.theme as UserRow['theme'],
      })
      .returning({ id: userTable.id });

    if (!inserted) throw new BadRequestException('user.failedToSave');

    const created = await this.findById(inserted.id);
    if (!created) throw new BadRequestException('user.failedToSave');
    return created;
  }

  async update(userId: IdType, update: UserUpdatePayload): Promise<UpdateAffected> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { role: _role, ...scalarUpdate } = update as UserUpdatePayload & { role?: unknown };

    const rows = await this.db
      .update(userTable)
      .set(scalarUpdate as Partial<typeof userTable.$inferInsert>)
      .where(eq(userTable.id, userId))
      .returning({ id: userTable.id });

    if (!rows.length) throw new NotFoundException('user.notFound');
    return { affected: rows.length };
  }

  async incrementTokenVersion(userId: IdType): Promise<number> {
    const [row] = await this.db
      .update(userTable)
      .set({ tokenVersion: sql`${userTable.tokenVersion} + 1` })
      .where(eq(userTable.id, userId))
      .returning({ tokenVersion: userTable.tokenVersion });

    if (!row) throw new NotFoundException('user.notFound');
    return row.tokenVersion;
  }

  async delete(id: IdType): Promise<UpdateAffected> {
    const rows = await this.db
      .update(userTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .returning({ id: userTable.id });

    return { affected: rows.length };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.email, email), isNull(userTable.deletedAt)))
      .limit(1);

    return rows.length > 0;
  }

  async countByRoleAccess(roleType: RoleType = RoleType.ADMIN): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(eq(userRoleTable.type, roleType as UserRoleRow['type']), isNull(userTable.deletedAt)));

    return count ?? 0;
  }

  async findIdWithRoleType(roleType: RoleType = RoleType.ADMIN): Promise<IdType | null> {
    const rows = await this.db
      .select({ id: userTable.id })
      .from(userTable)
      .leftJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(eq(userRoleTable.type, roleType as UserRoleRow['type']), isNull(userTable.deletedAt)))
      .limit(1);

    return rows[0]?.id ?? null;
  }
}
