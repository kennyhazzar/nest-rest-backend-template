import { IdType } from '@libs/common/id.type';
import { AuthUser } from '../entities/auth-user.entity';

export interface AuthUserFindOptions {
  includePassword?: boolean;
}

export type AuthUserUpdatePayload = Partial<
  Pick<
    AuthUser,
    'password' | 'failedLoginAttempts' | 'failedLoginWindowStartedAt' | 'lockedUntil' | 'tokenVersion'
  >
>;

export abstract class AuthUserRepository {
  abstract findByEmail(email: string, options?: AuthUserFindOptions): Promise<AuthUser | null>;
  abstract findById(id: IdType, options?: AuthUserFindOptions): Promise<AuthUser | null>;
  abstract update(id: IdType, payload: AuthUserUpdatePayload): Promise<void>;
}
