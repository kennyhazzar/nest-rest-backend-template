import { IdType } from '@libs/common/id.type';
import { RoleType } from '@libs/contracts/users/role-type.enum';

/**
 * Narrow, auth-relevant projection of the `user` table — deliberately does NOT carry
 * profile fields (name, gender, theme, notificationChannels, ...). Those stay owned by
 * apps/backend's own (unchanged) User domain entity; auth-service only ever needs enough
 * to verify credentials, track lockout state, and stamp a JWT.
 */
export class AuthUser {
  id!: IdType;
  email!: string;
  password?: string | null;
  roleId!: IdType;
  roleType!: RoleType;
  verified!: boolean;
  blocked!: boolean;
  failedLoginAttempts!: number;
  failedLoginWindowStartedAt?: Date | null;
  lockedUntil?: Date | null;
  tokenVersion!: number;
  language!: string;
}
