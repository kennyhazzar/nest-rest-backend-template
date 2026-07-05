import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { rolePermission as rolePermissionTable } from '@/common/drizzle/schema';
import { RoleType } from '@/enums/role-type.enum';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import {
  RolePermissionRepository,
  IRolePermission,
  RolePermissionCreatePayload,
} from '../../../domain/repositories/role-permission.repository';

type RolePermissionRow = typeof rolePermissionTable.$inferSelect;

@Injectable()
export class RolePermissionRepositoryDrizzle extends RolePermissionRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  private toPermission(row: RolePermissionRow): IRolePermission {
    return {
      id: row.id,
      roleType: row.roleType as RoleType,
      action: row.action as Actions,
      subject: row.subject as Subjects,
      description: row.description ?? undefined,
      isActive: row.isActive ?? true,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private buildWhere(filter?: { roleType?: RoleType; isActive?: boolean }) {
    const conditions = [isNull(rolePermissionTable.deletedAt)];
    if (filter?.roleType !== undefined) {
      conditions.push(eq(rolePermissionTable.roleType, filter.roleType as RolePermissionRow['roleType']));
    }
    if (filter?.isActive !== undefined) {
      conditions.push(eq(rolePermissionTable.isActive, filter.isActive));
    }
    return and(...conditions);
  }

  async find(filter?: { roleType?: RoleType; isActive?: boolean }): Promise<IRolePermission[]> {
    const rows = await this.db.select().from(rolePermissionTable).where(this.buildWhere(filter));
    return rows.map((r) => this.toPermission(r));
  }

  async findAndCount(filter?: { roleType?: RoleType; isActive?: boolean }): Promise<[IRolePermission[], number]> {
    const where = this.buildWhere(filter);
    const [rows, [{ count }]] = await Promise.all([
      this.db.select().from(rolePermissionTable).where(where),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(rolePermissionTable)
        .where(where),
    ]);
    return [rows.map((r) => this.toPermission(r)), count];
  }

  async findByRoleType(roleType: RoleType): Promise<IRolePermission[]> {
    const rows = await this.db
      .select()
      .from(rolePermissionTable)
      .where(
        and(
          eq(rolePermissionTable.roleType, roleType as RolePermissionRow['roleType']),
          eq(rolePermissionTable.isActive, true),
          isNull(rolePermissionTable.deletedAt),
        ),
      )
      .orderBy(rolePermissionTable.subject, rolePermissionTable.action);

    return rows.map((r) => this.toPermission(r));
  }

  async hasPermission(roleType: RoleType, action: Actions, subject: Subjects[] | Subjects): Promise<boolean> {
    const subjects = Array.isArray(subject) ? subject : [subject];
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(rolePermissionTable)
      .where(
        and(
          eq(rolePermissionTable.roleType, roleType as RolePermissionRow['roleType']),
          eq(rolePermissionTable.action, action as RolePermissionRow['action']),
          inArray(rolePermissionTable.subject, subjects as RolePermissionRow['subject'][]),
          eq(rolePermissionTable.isActive, true),
          isNull(rolePermissionTable.deletedAt),
        ),
      );

    return (count ?? 0) > 0;
  }

  async create(permission: RolePermissionCreatePayload): Promise<IRolePermission> {
    const [inserted] = await this.db
      .insert(rolePermissionTable)
      .values({
        roleType: permission.roleType as RolePermissionRow['roleType'],
        action: permission.action as RolePermissionRow['action'],
        subject: permission.subject as RolePermissionRow['subject'],
        description: permission.description,
        isActive: permission.isActive ?? true,
      })
      .returning();

    return this.toPermission(inserted);
  }

  async createMany(permissions: RolePermissionCreatePayload[]): Promise<IRolePermission[]> {
    if (!permissions.length) return [];

    const rows = await this.db
      .insert(rolePermissionTable)
      .values(
        permissions.map((p) => ({
          roleType: p.roleType,
          action: p.action,
          subject: p.subject,
          description: p.description,
          isActive: p.isActive ?? true,
        })),
      )
      .returning();

    return rows.map((r) => this.toPermission(r));
  }

  async deleteByRoleType(roleType: RoleType): Promise<void> {
    await this.db
      .delete(rolePermissionTable)
      .where(eq(rolePermissionTable.roleType, roleType as RolePermissionRow['roleType']));
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(rolePermissionTable);
  }

  async count(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(rolePermissionTable)
      .where(isNull(rolePermissionTable.deletedAt));

    return count ?? 0;
  }
}
