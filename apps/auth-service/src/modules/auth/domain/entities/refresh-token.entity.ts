import { IdType } from '@libs/common/id.type';

export class RefreshTokenRecord {
  id!: IdType;
  userId!: IdType;
  refreshToken!: string;
  expiresAt!: Date;
  isRevoked!: boolean;
}
