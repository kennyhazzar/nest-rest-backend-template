import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';

import { setAuthCookies } from '../../infrastructure/adapters/auth-cookies.helper';
import { AuthMode } from '@libs/auth/auth-mode.enum';
import { LoginFailureReason } from '@libs/contracts/auth';
import { UserRepository } from '../../domain/repositories';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { AuthResponseDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';
import { UserLoginCommand } from '../commands';
import { UserLoginFailedEvent, UserLoginSucceededEvent } from '../events/auth.events';

/**
 * Handles {@link UserLoginCommand}.
 *
 * Thin orchestrator: delegates credential verification, lockout bookkeeping and token
 * issuance to auth-service via {@link AuthGatewayPort} (the CPU-heavy Argon2 work happens
 * there, isolated from this process). This handler's job is to translate the structured
 * result back into the same domain events / HTTP exceptions / cookies this endpoint always
 * produced, and to attach the local user profile to the response.
 */
@CommandHandler(UserLoginCommand)
export class LoginUserHandler implements ICommandHandler<UserLoginCommand> {
  private readonly logger = new Logger(LoginUserHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
    private readonly authGateway: AuthGatewayPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: UserLoginCommand): Promise<AuthResponseDto> {
    const { email, password } = command.payload;

    const result = await this.authGateway.login({
      email,
      password,
      requestIp: (command.request.headers['x-real-ip'] as string) ?? command.request.ip ?? '',
      userAgent: (command.request.headers['user-agent'] as string) ?? '',
    });

    if (!result.success) {
      this.eventBus.publish(new UserLoginFailedEvent(email));

      switch (result.failureReason) {
        case LoginFailureReason.NOT_VERIFIED:
          this.logger.warn(`User login failed: email=${email} reason=user_not_verified`);
          throw new UnauthorizedException('user.auth.verified');
        case LoginFailureReason.BLOCKED:
          this.logger.warn(`User login failed: email=${email} reason=user_blocked`);
          throw new UnauthorizedException('user.auth.blocked');
        case LoginFailureReason.ACCOUNT_LOCKED:
          this.logger.warn(`User login rejected: email=${email} reason=account_locked lockedUntil=${result.lockedUntil}`);
          throw new ForbiddenException({ message: 'user.auth.accountLocked', lockedUntil: result.lockedUntil });
        case LoginFailureReason.INVALID_CREDENTIALS:
          this.logger.warn(`User login failed: email=${email} reason=invalid_credentials`);
          throw new UnauthorizedException({
            message: 'user.auth.invalidCredentials',
            requiresCaptcha: result.requiresCaptcha,
          });
        case LoginFailureReason.USER_NOT_FOUND:
        default:
          this.logger.warn(`User login failed: email=${email} reason=user_not_found`);
          throw new UnauthorizedException('user.auth.invalidCredentials');
      }
    }

    this.eventBus.publish(new UserLoginSucceededEvent(result.userId, result.email));
    this.logger.log(`User login succeeded: userId=${result.userId} email=${result.email}`);

    setAuthCookies(
      command.reply,
      { accessToken: result.accessToken, refreshToken: result.refreshToken, csrfToken: result.csrfToken },
      this.configService,
    );

    const mode = this.configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);
    const csrfEnabled = this.configService.get<boolean>('auth.csrf.enabled', false);
    const user = await this.userRepository.findById(result.userId);

    return {
      accessToken: mode !== AuthMode.COOKIES_ONLY ? result.accessToken : undefined,
      refreshToken: mode !== AuthMode.COOKIES_ONLY ? result.refreshToken : undefined,
      csrfToken: csrfEnabled && mode !== AuthMode.COOKIES_ONLY ? result.csrfToken : undefined,
      user: UserMapper.toDto(user!),
    };
  }
}
