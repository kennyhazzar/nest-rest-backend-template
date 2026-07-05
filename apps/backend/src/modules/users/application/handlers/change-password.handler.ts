import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordService } from '../../domain/services/password.service';
import { AuthServiceAdapter } from '../../infrastructure/adapters/auth-service.adapter';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { PasswordChangedEvent } from '../events/auth.events';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  private readonly logger = new Logger(ChangePasswordHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly authService: AuthServiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordCommand): Promise<{ success: boolean }> {
    if (newPassword.length < 12) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=new_password_too_short`);
      throw new BadRequestException('user.auth.passwordMinLength');
    }

    const user = await this.userRepository.findById(userId, { includePassword: true });
    if (!user) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=user_not_found`);
      throw new UnauthorizedException('user.notFound');
    }
    if (!user.password) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=password_not_configured`);
      throw new UnauthorizedException('user.auth.passwordNotConfigured');
    }

    const valid = await this.passwordService.verifyPassword(user.password, currentPassword);
    if (!valid) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=current_password_invalid`);
      throw new UnauthorizedException('user.auth.currentPasswordInvalid');
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    await this.userRepository.update(userId, { password: passwordHash });
    await this.authService.revokeAllRefreshTokensForUser(userId);
    this.eventBus.publish(new PasswordChangedEvent(userId));
    this.logger.log(`Password changed: userId=${userId} refreshTokensRevoked=true`);

    return { success: true };
  }
}
