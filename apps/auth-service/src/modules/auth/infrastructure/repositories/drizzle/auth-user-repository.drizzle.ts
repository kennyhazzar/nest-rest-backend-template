import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, isNull } from 'drizzle-orm';

import { IdType } from '@libs/common/id.type';
import { RoleType } from '@libs/contracts/users/role-type.enum';
import { user as userTable, userRole as userRoleTable } from '@libs/database/users.schema';
import * as schema from '@libs/database/users.schema';
import { DRIZZLE_CONNECTION } from '../../../../../drizzle.provider';
import { AuthUser } from '../../../domain/entities/auth-user.entity';
import {
  AuthUserFindOptions,
  AuthUserRepository,
  AuthUserUpdatePayload,
} from '../../../domain/repositories/auth-user.repository';

type UserRow = typeof userTable.$inferSelect;
type UserRoleRow = typeof userRoleTable.$inferSelect;

@Injectable()
export class AuthUserRepositoryDrizzle extends AuthUserRepository {
  constructor(
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    super();
  }

  private toAuthUser(row: UserRow, roleRow: UserRoleRow): AuthUser {
    const authUser = new AuthUser();
    authUser.id = row.id;
    authUser.email = row.email;
    authUser.password = row.password ?? null;
    authUser.roleId = row.roleId;
    authUser.roleType = roleRow.type as RoleType;
    authUser.verified = row.verified ?? false;
    authUser.blocked = row.blocked ?? false;
    authUser.failedLoginAttempts = row.failedLoginAttempts ?? 0;
    authUser.failedLoginWindowStartedAt = row.failedLoginWindowStartedAt ?? null;
    authUser.lockedUntil = row.lockedUntil ?? null;
    authUser.tokenVersion = row.tokenVersion ?? 1;
    authUser.language = row.language ?? 'ru';
    return authUser;
  }

  async findByEmail(email: string, options?: AuthUserFindOptions): Promise<AuthUser | null> {
    const where = and(eq(userTable.email, email), isNull(userTable.deletedAt));

    if (options?.includePassword) {
      const [row] = await this.db
        .select({ user: userTable, role: userRoleTable })
        .from(userTable)
        .innerJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
        .where(where)
        .limit(1);
      return row ? this.toAuthUser(row.user, row.role) : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...userWithoutPassword } = userTable;
    const [row] = await this.db
      .select({ user: userWithoutPassword, role: userRoleTable })
      .from(userTable)
      .innerJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(where)
      .limit(1);
    return row ? this.toAuthUser(row.user as UserRow, row.role) : null;
  }

  async findById(id: IdType, _options?: AuthUserFindOptions): Promise<AuthUser | null> {
    const [row] = await this.db
      .select({ user: userTable, role: userRoleTable })
      .from(userTable)
      .innerJoin(userRoleTable, eq(userTable.roleId, userRoleTable.id))
      .where(and(eq(userTable.id, id), isNull(userTable.deletedAt)))
      .limit(1);
    return row ? this.toAuthUser(row.user, row.role) : null;
  }

  async update(id: IdType, payload: AuthUserUpdatePayload): Promise<void> {
    const rows = await this.db
      .update(userTable)
      .set(payload as Partial<typeof userTable.$inferInsert>)
      .where(eq(userTable.id, id))
      .returning({ id: userTable.id });

    if (!rows.length) throw new NotFoundException('user.notFound');
  }
}
