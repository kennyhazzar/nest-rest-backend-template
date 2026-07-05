import { IdType } from '@/interfaces/id.type';

export class PasswordResetToken {
  id!: IdType;
  userId!: IdType;
  token!: string;
  expiresAt!: Date;
  isUsed!: boolean;
  createdAt!: Date;

  static create(payload: {
    userId: IdType;
    token: string;
    expiresAt: Date;
  }): Omit<PasswordResetToken, 'id' | 'createdAt'> {
    return {
      userId: payload.userId,
      token: payload.token,
      expiresAt: payload.expiresAt,
      isUsed: false,
    } as Omit<PasswordResetToken, 'id' | 'createdAt'>;
  }

  isExpired(): boolean {
    return new Date() >= this.expiresAt;
  }

  isValid(): boolean {
    return !this.isUsed && !this.isExpired();
  }
}
