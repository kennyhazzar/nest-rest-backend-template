import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { setAuthCookies } from '../../infrastructure/adapters/auth-cookies.helper';
import { AuthMode } from '@libs/auth/auth-mode.enum';
import { RefreshTokensFailureReason } from '@libs/contracts/auth';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { AccessTokenResponseDto } from '../../presentation/dtos';
import { RefreshTokensCommand } from '../commands/refresh-tokens.command';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  private readonly logger = new Logger(RefreshTokensHandler.name);

  constructor(
    private readonly authGateway: AuthGatewayPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: RefreshTokensCommand): Promise<AccessTokenResponseDto> {
    const result = await this.authGateway.refreshTokens({
      refreshToken: command.refreshToken,
      requestIp: (command.request.headers['x-real-ip'] as string) ?? command.request.ip ?? '',
      userAgent: (command.request.headers['user-agent'] as string) ?? '',
    });

    if (!result.success) {
      this.logger.warn(`Refresh token rotation rejected: reason=${result.failureReason}`);
      switch (result.failureReason) {
        case RefreshTokensFailureReason.TOKEN_REVOKED:
          throw new ForbiddenException('user.auth.tokenRevoked');
        case RefreshTokensFailureReason.TOKEN_NOT_FOUND:
          throw new UnauthorizedException('user.auth.tokenNotFound');
        case RefreshTokensFailureReason.TOKEN_EXPIRED:
          throw new UnauthorizedException('user.auth.tokenExpired');
        case RefreshTokensFailureReason.USER_NOT_FOUND:
          throw new UnauthorizedException('user.notFound');
        case RefreshTokensFailureReason.NOT_VERIFIED:
          throw new UnauthorizedException('user.auth.verified');
        case RefreshTokensFailureReason.BLOCKED:
          throw new UnauthorizedException('user.auth.blocked');
        case RefreshTokensFailureReason.INVALID_JWT_PAYLOAD:
        default:
          throw new UnauthorizedException('user.auth.invalidJwtPayload');
      }
    }

    setAuthCookies(
      command.reply,
      { accessToken: result.accessToken, refreshToken: result.refreshToken, csrfToken: result.csrfToken },
      this.configService,
    );

    this.logger.log('Refresh token rotation succeeded');

    const mode = this.configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);

    return {
      accessToken: mode !== AuthMode.COOKIES_ONLY ? result.accessToken : undefined,
      refreshToken: mode !== AuthMode.COOKIES_ONLY ? result.refreshToken : undefined,
      csrfToken: result.csrfToken,
    };
  }
}
