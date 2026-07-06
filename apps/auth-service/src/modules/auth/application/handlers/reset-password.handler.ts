import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { PasswordService } from '@libs/auth/password.service';
import { ResetPasswordFailureReason, ResetPasswordResponse } from '@libs/contracts/auth';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { ResetPasswordCommand } from '../commands/reset-password.command';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute({ token, newPassword }: ResetPasswordCommand): Promise<ResetPasswordResponse> {
    if (newPassword.length < 12) {
      this.logger.warn('Password reset rejected: reason=new_password_too_short');
      return { success: false, userId: '', failureReason: ResetPasswordFailureReason.WEAK_PASSWORD };
    }

    const record = await this.resetTokenRepository.findByToken(token);
    if (!record || !record.isValid()) {
      this.logger.warn('Password reset rejected: reason=reset_token_invalid_or_expired');
      return { success: false, userId: '', failureReason: ResetPasswordFailureReason.TOKEN_INVALID_OR_EXPIRED };
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.update(record.userId, { password: passwordHash });
    await this.resetTokenRepository.markUsed(record.id);
    await this.refreshTokenRepository.revokeAllForUser(record.userId);
    this.logger.log(`Password reset completed: userId=${record.userId} refreshTokensRevoked=true`);

    return { success: true, userId: record.userId, failureReason: '' };
  }
}
