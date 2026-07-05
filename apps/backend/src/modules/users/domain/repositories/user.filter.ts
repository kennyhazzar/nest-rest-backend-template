import { IdType } from '@/interfaces/id.type';
import { IUser } from '../interfaces/user.interface';

/**
 * Replaces FindManyOptions<UserEntity> in domain repository signatures.
 */
export interface UserFilter {
  ids?: IdType[];
  email?: string;
  roleId?: string;
  blocked?: boolean;
  verified?: boolean;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

/**
 * Replaces FindOneOptions<UserEntity> — semantic flags instead of raw ORM select/relations objects.
 */
export interface UserFindOneOptions {
  /** Load password field (excluded by default for security) */
  includePassword?: boolean;
  /** Load role relation */
  includeRole?: boolean;
  includeDeleted?: boolean;
}

/**
 * Replaces UpdateResult — ORM-agnostic result of a write operation.
 */
export interface UpdateAffected {
  affected: number;
}

/**
 * Replaces DeepPartial<UserEntity> for update payloads.
 */
export type UserUpdatePayload = Partial<Omit<IUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
