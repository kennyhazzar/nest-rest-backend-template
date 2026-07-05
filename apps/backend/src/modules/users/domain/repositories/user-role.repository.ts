import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { UserRole, Roles } from '../entities';
import { UserRoleFilter, UserRoleUpdatePayload, UpdateAffected } from './user-role.filter';

/**
 * Abstract repository for user roles — no ORM dependency in domain.
 */
export abstract class UserRoleRepository {
  abstract find(filter?: UserRoleFilter): Promise<Roles>;

  abstract findOne(filter: UserRoleFilter): Promise<UserRole | null>;

  abstract findById(id: IdType): Promise<UserRole | null>;

  abstract findByType(type: RoleType): Promise<UserRole | null>;

  abstract create(role: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<UserRole>;

  abstract update(id: IdType, update: UserRoleUpdatePayload): Promise<UpdateAffected>;

  abstract delete(id: IdType): Promise<UpdateAffected>;

  abstract clearCache(): Promise<void>;
}
