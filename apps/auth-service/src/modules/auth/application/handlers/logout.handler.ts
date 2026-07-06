import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { LogoutResponse } from '@libs/contracts/auth';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { TokenIssuerService } from '../../infrastructure/services/token-issuer.service';
import { LogoutCommand } from '../commands/logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  private readonly logger = new Logger(LogoutHandler.name);

  constructor(
    private readonly tokenIssuer: TokenIssuerService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(command: LogoutCommand): Promise<LogoutResponse> {
    const credentials = await this.tokenIssuer.validateRefreshToken(command.refreshToken);
    if (!credentials) {
      this.logger.warn('Logout rejected: reason=invalid_refresh_token');
      return { success: false };
    }

    const success = await this.refreshTokenRepository.revokeByToken(command.refreshToken);
    this.logger.log(`Logout processed: userId=${credentials.userId} success=${success}`);
    return { success };
  }
}
