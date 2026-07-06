import { IdType } from '@libs/common/id.type';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

export abstract class PasswordResetTokenRepository {
  abstract create(token: Omit<PasswordResetToken, 'id' | 'createdAt'>): Promise<PasswordResetToken>;
  abstract findByToken(token: string): Promise<PasswordResetToken | null>;
  abstract markUsed(id: IdType): Promise<void>;
}
