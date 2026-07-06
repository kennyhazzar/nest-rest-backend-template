import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { ResetPasswordFailureReason } from '@libs/contracts/auth';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { ResetPasswordCommand } from '../commands/reset-password.command';
import { PasswordResetCompletedEvent } from '../events/auth.events';

@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand> {
  private readonly logger = new Logger(ResetPasswordHandler.name);

  constructor(
    private readonly authGateway: AuthGatewayPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ token, newPassword }: ResetPasswordCommand): Promise<{ success: boolean }> {
    const result = await this.authGateway.resetPassword({ token, newPassword });

    if (!result.success) {
      this.logger.warn(`Password reset rejected: reason=${result.failureReason}`);
      switch (result.failureReason) {
        case ResetPasswordFailureReason.WEAK_PASSWORD:
          throw new BadRequestException('user.auth.passwordMinLength');
        case ResetPasswordFailureReason.TOKEN_INVALID_OR_EXPIRED:
        default:
          throw new BadRequestException('user.auth.resetTokenInvalidOrExpired');
      }
    }

    this.eventBus.publish(new PasswordResetCompletedEvent(result.userId));
    this.logger.log(`Password reset completed: userId=${result.userId}`);
    return { success: true };
  }
}
