import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, isNull, sql, SQL } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { userRole as userRoleTable } from '@/common/drizzle/schema';
import { RoleType } from '@/enums/role-type.enum';
import { IdType } from '@/interfaces/id.type';
import { UserRoleRepository } from '../../../domain/repositories/user-role.repository';
import { UserRoleFilter, UserRoleUpdatePayload, UpdateAffected } from '../../../domain/repositories/user-role.filter';
import { UserRole, Roles } from '../../../domain/entities';

type UserRoleRow = typeof userRoleTable.$inferSelect;

@Injectable()
export class UserRoleRepositoryDrizzle extends UserRoleRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  private toRole(row: UserRoleRow): UserRole {
    const role = new UserRole();
    role.id = row.id;
    role.name = row.name;
    role.description = row.description ?? undefined;
    role.type = row.type as RoleType;
    role.createdAt = row.createdAt;
    role.updatedAt = row.updatedAt;
    role.deletedAt = row.deletedAt;
    return role;
  }

  private buildWhere(filter?: UserRoleFilter): SQL | undefined {
    const conditions: SQL[] = [];
    if (!filter?.includeDeleted) conditions.push(isNull(userRoleTable.deletedAt));
    if (filter?.type) conditions.push(eq(userRoleTable.type, filter.type));
    if (filter?.name) conditions.push(eq(userRoleTable.name, filter.name));
    if (filter?.ids?.length) conditions.push(inArray(userRoleTable.id, filter.ids));
    return conditions.length ? and(...conditions) : undefined;
  }

  async find(filter?: UserRoleFilter): Promise<Roles> {
    const where = this.buildWhere(filter);

    const baseQuery = this.db.select().from(userRoleTable).where(where);
    const rows = await (filter?.limit !== undefined
      ? baseQuery.limit(filter.limit).offset(filter.offset ?? 0)
      : baseQuery);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoleTable)
      .where(where);

    const roles = new Roles();
    roles.push(...rows.map((r) => this.toRole(r)));
    roles.totalCount = count;
    return roles;
  }

  async findOne(filter: UserRoleFilter): Promise<UserRole | null> {
    const rows = await this.db.select().from(userRoleTable).where(this.buildWhere(filter)).limit(1);

    return rows[0] ? this.toRole(rows[0]) : null;
  }

  async findById(id: IdType): Promise<UserRole | null> {
    const rows = await this.db
      .select()
      .from(userRoleTable)
      .where(and(eq(userRoleTable.id, id), isNull(userRoleTable.deletedAt)))
      .limit(1);

    return rows[0] ? this.toRole(rows[0]) : null;
  }

  async findByType(type: RoleType): Promise<UserRole | null> {
    const rows = await this.db
      .select()
      .from(userRoleTable)
      .where(and(eq(userRoleTable.type, type), isNull(userRoleTable.deletedAt)))
      .orderBy(userRoleTable.createdAt)
      .limit(1);

    return rows[0] ? this.toRole(rows[0]) : null;
  }

  async create(role: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<UserRole> {
    const [inserted] = await this.db
      .insert(userRoleTable)
      .values({ name: role.name, description: role.description, type: role.type })
      .returning();

    if (!inserted) throw new BadRequestException('user.role.failedToSave');
    return this.toRole(inserted);
  }

  async update(roleId: IdType, update: UserRoleUpdatePayload): Promise<UpdateAffected> {
    const rows = await this.db
      .update(userRoleTable)
      .set({
        ...(update.name !== undefined && { name: update.name }),
        ...(update.description !== undefined && { description: update.description }),
        ...(update.type !== undefined && { type: update.type }),
        updatedAt: new Date(),
      })
      .where(and(eq(userRoleTable.id, roleId), isNull(userRoleTable.deletedAt)))
      .returning({ id: userRoleTable.id });

    if (!rows.length) throw new NotFoundException('user.role.notFound');
    return { affected: rows.length };
  }

  async delete(roleId: IdType): Promise<UpdateAffected> {
    const rows = await this.db
      .update(userRoleTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(userRoleTable.id, roleId), isNull(userRoleTable.deletedAt)))
      .returning({ id: userRoleTable.id });

    if (!rows.length) throw new NotFoundException('user.role.notFound');
    return { affected: rows.length };
  }

  async clearCache(): Promise<void> {
    // No-op: Drizzle has no built-in query cache
  }
}
