import type { JwtPayload, SignOptions } from 'jsonwebtoken';

import type { IdType } from '@libs/common/id.type';
import type { RoleType } from '@libs/contracts/users/role-type.enum';

/* eslint-disable-next-line */
export const JWT_BASE_OPTIONS = (userId: IdType): SignOptions => ({});

export interface JwtPayloadApp extends JwtPayload {
  sub: IdType;
  rid: IdType;
  rty: RoleType; // Role type in payload
  lng: string;
  tv?: number; // User token version snapshot
}

export interface ValidateJWT {
  userId: IdType;
  roleId: IdType;
  roleType: RoleType; // Role type in validation
  language: string;
  tokenVersion?: number;
}
