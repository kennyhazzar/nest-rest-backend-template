import { IdType } from '@libs/common/id.type';
import { RefreshTokenRecord } from '../entities/refresh-token.entity';

export interface RefreshTokenCreatePayload {
  userId: IdType;
  refreshToken: string;
  expiresAt: Date;
  fingerprint: string;
  userAgent: string;
}

export abstract class RefreshTokenRepository {
  abstract create(payload: RefreshTokenCreatePayload): Promise<void>;
  abstract findByToken(token: string): Promise<RefreshTokenRecord | null>;
  abstract revokeById(id: IdType): Promise<void>;
  abstract revokeByToken(token: string): Promise<boolean>;
  abstract revokeAllForUser(userId: IdType): Promise<void>;
}
