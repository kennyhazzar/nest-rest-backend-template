import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { IUserRole } from '../interfaces/user-role.interface';

/**
 * Replaces FindManyOptions<UserRoleEntity> in domain repository signatures.
 */
export interface UserRoleFilter {
  ids?: IdType[];
  type?: RoleType;
  name?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Replaces UpdateResult for role write operations.
 */
export interface UpdateAffected {
  affected: number;
}

/**
 * Replaces DeepPartial<UserRoleEntity> for update payloads.
 */
export type UserRoleUpdatePayload = Partial<Omit<IUserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
