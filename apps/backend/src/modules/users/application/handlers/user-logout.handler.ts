import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';

import { clearAuthCookies } from '../../infrastructure/adapters/auth-cookies.helper';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { LogoutResponseDto } from '../../presentation/dtos';
import { UserLogoutCommand } from '../commands';
import { UserLoggedOutEvent } from '../events/auth.events';

@CommandHandler(UserLogoutCommand)
export class UserLogoutHandler implements ICommandHandler<UserLogoutCommand> {
  private readonly logger = new Logger(UserLogoutHandler.name);

  constructor(
    private readonly authGateway: AuthGatewayPort,
    private readonly eventBus: EventBus,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: UserLogoutCommand): Promise<LogoutResponseDto> {
    const result = await this.authGateway.logout({ refreshToken: command.refreshToken });
    clearAuthCookies(command.reply, this.configService);
    this.eventBus.publish(new UserLoggedOutEvent(result.success));
    this.logger.log(`User logout processed: success=${result.success}`);

    return {
      success: result.success,
      message: result.success ? 'user.auth.logout.success' : 'user.auth.logout.failed',
    };
  }
}
