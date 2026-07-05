import type { RoleType } from '@/enums/role-type.enum';
import type { Actions } from '@/enums/actions.enum';
import type { Subjects } from '@/enums/subjects.enum';
import type { IBaseEntity } from '@/common/domain/base.entity';

/**
 * Domain representation of a role permission — no ORM decorators.
 */
export interface IRolePermission extends IBaseEntity {
  roleType: RoleType;
  action: Actions;
  subject: Subjects;
  description?: string;
  isActive?: boolean;
}

export type RolePermissionCreatePayload = Omit<IRolePermission, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * Abstract repository for role permissions — no ORM dependency in domain.
 */
export abstract class RolePermissionRepository {
  /**
   * Find all permissions
   */
  abstract find(filter?: { roleType?: RoleType; isActive?: boolean }): Promise<IRolePermission[]>;

  /**
   * Find all permissions and count
   */
  abstract findAndCount(filter?: { roleType?: RoleType; isActive?: boolean }): Promise<[IRolePermission[], number]>;

  /**
   * Find permissions for specific role
   */
  abstract findByRoleType(roleType: RoleType): Promise<IRolePermission[]>;

  /**
   * Check if permission exists for role
   */
  abstract hasPermission(roleType: RoleType, action: Actions, subject: Subjects[] | Subjects): Promise<boolean>;

  /**
   * Create permission
   */
  abstract create(permission: RolePermissionCreatePayload): Promise<IRolePermission>;

  /**
   * Create multiple permissions
   */
  abstract createMany(permissions: RolePermissionCreatePayload[]): Promise<IRolePermission[]>;

  /**
   * Delete all permissions for role
   */
  abstract deleteByRoleType(roleType: RoleType): Promise<void>;

  /**
   * Delete all permissions (for recreation)
   */
  abstract deleteAll(): Promise<void>;

  /**
   * Count total permissions
   */
  abstract count(): Promise<number>;
}
