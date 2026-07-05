import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordService } from '../../domain/services/password.service';
import { AuthServiceAdapter } from '../../infrastructure/adapters/auth-service.adapter';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { PasswordResetCompletedEvent } from '../events/auth.events';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthServiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ token, newPassword }: ResetPasswordCommand): Promise<{ success: boolean }> {
    if (newPassword.length < 12) {
      this.logger.warn('Password reset rejected: reason=new_password_too_short');
      throw new BadRequestException('user.auth.passwordMinLength');
    }

    const record = await this.resetTokenRepository.findByToken(token);
    if (!record || !record.isValid()) {
      this.logger.warn('Password reset rejected: reason=reset_token_invalid_or_expired');
      throw new BadRequestException('user.auth.resetTokenInvalidOrExpired');
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.update(record.userId, { password: passwordHash });
    await this.resetTokenRepository.markUsed(record.id);
    await this.authService.revokeAllRefreshTokensForUser(record.userId);
    this.eventBus.publish(new PasswordResetCompletedEvent(record.userId));
    this.logger.log(`Password reset completed: userId=${record.userId} refreshTokensRevoked=true`);

    return { success: true };
  }
}
