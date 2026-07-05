import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { User, Users } from '../entities';
import { UserFilter, UserFindOneOptions, UserUpdatePayload, UpdateAffected } from './user.filter';

export abstract class UserRepository {
  abstract find(filter?: UserFilter): Promise<Users>;

  abstract findOne(filter: UserFilter, options?: UserFindOneOptions): Promise<User | null>;

  abstract findById(id: IdType, options?: UserFindOneOptions): Promise<User | null>;

  abstract findByIds(ids: IdType[]): Promise<Users>;

  abstract findByEmail(email: string, options?: UserFindOneOptions): Promise<User | null>;

  abstract create(user: User): Promise<User>;

  abstract update(userId: IdType, update: UserUpdatePayload): Promise<UpdateAffected>;

  abstract delete(id: IdType): Promise<UpdateAffected>;

  abstract existsByEmail(email: string): Promise<boolean>;

  abstract countByRoleAccess(roleType?: RoleType): Promise<number>;

  abstract findIdWithRoleType(roleType?: RoleType): Promise<IdType | null>;
}
