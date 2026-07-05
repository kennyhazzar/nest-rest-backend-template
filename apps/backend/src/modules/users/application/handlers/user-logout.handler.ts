import { Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { AuthServiceAdapter } from '../../infrastructure/adapters';
import { UserLogoutCommand } from '../commands';
import { UserLoggedOutEvent } from '../events/auth.events';

@CommandHandler(UserLogoutCommand)
export class UserLogoutHandler implements ICommandHandler<UserLogoutCommand> {
  private readonly logger = new Logger(UserLogoutHandler.name);

  constructor(
    private readonly authService: AuthServiceAdapter,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UserLogoutCommand): Promise<boolean> {
    const success = await this.authService.revokeRefreshToken(command.refreshToken);
    this.eventBus.publish(new UserLoggedOutEvent(success));
    this.logger.log(`User logout processed: success=${success}`);
    return success;
  }
}
