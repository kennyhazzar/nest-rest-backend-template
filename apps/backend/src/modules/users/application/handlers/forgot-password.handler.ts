import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { PasswordResetRequestedEvent } from '../events/auth.events';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  private readonly logger = new Logger(ForgotPasswordHandler.name);

  constructor(
    private readonly authGateway: AuthGatewayPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ email }: ForgotPasswordCommand): Promise<{ success: boolean }> {
    this.logger.log(`Password reset requested: email=${email}`);
    const result = await this.authGateway.forgotPassword({ email });

    this.eventBus.publish(new PasswordResetRequestedEvent(email, result.userId || undefined));
    return { success: result.success };
  }
}
