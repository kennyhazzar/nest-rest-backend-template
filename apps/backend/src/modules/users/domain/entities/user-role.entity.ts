import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { IUserRole } from '../interfaces/user-role.interface';

export type { IUserRole };

/**
 * Domain UserRole entity — pure TypeScript, no ORM dependency.
 */
export class UserRole implements IUserRole {
  id!: IdType;
  name!: string;
  description?: string;
  type!: RoleType;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  static create(data: Omit<IUserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): UserRole {
    const role = new UserRole();
    Object.assign(role, data);
    return role;
  }
}

/**
 * Roles aggregate
 */
export class Roles extends Array<UserRole> {
  totalCount: number = 0;

  static create(roles: UserRole[], totalCount?: number): Roles {
    const aggregate = new Roles();
    aggregate.push(...roles);
    aggregate.totalCount = totalCount ?? roles.length;
    return aggregate;
  }
}
