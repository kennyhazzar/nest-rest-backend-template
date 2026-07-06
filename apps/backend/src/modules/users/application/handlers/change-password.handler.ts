import { BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { ChangePasswordFailureReason } from '@libs/contracts/auth';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { ChangePasswordCommand } from '../commands/change-password.command';
import { PasswordChangedEvent } from '../events/auth.events';

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand> {
  private readonly logger = new Logger(ChangePasswordHandler.name);

  constructor(
    private readonly authGateway: AuthGatewayPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ userId, currentPassword, newPassword }: ChangePasswordCommand): Promise<{ success: boolean }> {
    const result = await this.authGateway.changePassword({ userId, currentPassword, newPassword });

    if (!result.success) {
      this.logger.warn(`Password change rejected: userId=${userId} reason=${result.failureReason}`);
      switch (result.failureReason) {
        case ChangePasswordFailureReason.WEAK_PASSWORD:
          throw new BadRequestException('user.auth.passwordMinLength');
        case ChangePasswordFailureReason.USER_NOT_FOUND:
          throw new UnauthorizedException('user.notFound');
        case ChangePasswordFailureReason.PASSWORD_NOT_CONFIGURED:
          throw new UnauthorizedException('user.auth.passwordNotConfigured');
        case ChangePasswordFailureReason.CURRENT_PASSWORD_INVALID:
        default:
          throw new UnauthorizedException('user.auth.currentPasswordInvalid');
      }
    }

    this.eventBus.publish(new PasswordChangedEvent(userId));
    this.logger.log(`Password changed: userId=${userId}`);
    return { success: true };
  }
}
