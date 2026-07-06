import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { PasswordService } from '@libs/auth/password.service';
import { ChangePasswordFailureReason, ChangePasswordResponse } from '@libs/contracts/auth';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { ChangePasswordCommand } from '../commands/change-password.command';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  private readonly logger = new Logger(ChangePasswordHandler.name);

  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly passwordService: PasswordService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordCommand): Promise<ChangePasswordResponse> {
    if (newPassword.length < 12) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=new_password_too_short`);
      return { success: false, failureReason: ChangePasswordFailureReason.WEAK_PASSWORD };
    }

    const user = await this.userRepository.findById(userId, { includePassword: true });
    if (!user) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=user_not_found`);
      return { success: false, failureReason: ChangePasswordFailureReason.USER_NOT_FOUND };
    }
    if (!user.password) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=password_not_configured`);
      return { success: false, failureReason: ChangePasswordFailureReason.PASSWORD_NOT_CONFIGURED };
    }

    const valid = await this.passwordService.verifyPassword(user.password, currentPassword);
    if (!valid) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=current_password_invalid`);
      return { success: false, failureReason: ChangePasswordFailureReason.CURRENT_PASSWORD_INVALID };
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.update(userId, { password: passwordHash });
    await this.refreshTokenRepository.revokeAllForUser(userId);
    this.logger.log(`Password changed: userId=${userId} refreshTokensRevoked=true`);

    return { success: true, failureReason: '' };
  }
}
