import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { PasswordService } from '@libs/auth/password.service';
import { LoginFailureReason, LoginResponse } from '@libs/contracts/auth';
import { AuthUser } from '../../domain/entities/auth-user.entity';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { TokenIssuerService } from '../../infrastructure/services/token-issuer.service';
import { MailProducerService } from '../../infrastructure/services/mail-producer.service';
import { LoginCommand } from '../commands/login.command';

const CAPTCHA_ATTEMPT_THRESHOLD = 3;
const LOCK_ATTEMPT_THRESHOLD = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

const NO_TOKENS = { accessToken: '', refreshToken: '', csrfToken: '', userId: '', email: '' };

/**
 * Mirrors apps/backend's (former) LoginUserHandler business logic verbatim — this is the
 * code whose Argon2 verify was measured to saturate CPU under a login surge; it now runs
 * here instead, isolated from the rest of the product. apps/backend keeps a thin handler of
 * the same name that calls this service over gRPC and translates the result back into the
 * same events/exceptions/i18n keys it always produced.
 */
@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  private readonly logger = new Logger(LoginHandler.name);

  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenIssuer: TokenIssuerService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly mailProducer: MailProducerService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResponse> {
    const { email, password } = command;

    const user = await this.userRepository.findByEmail(email, { includePassword: true });

    if (!user) {
      this.logger.warn(`Login failed: email=${email} reason=user_not_found`);
      return { ...NO_TOKENS, success: false, failureReason: LoginFailureReason.USER_NOT_FOUND, lockedUntil: '', requiresCaptcha: false };
    }

    if (!user.verified) {
      this.logger.warn(`Login failed: userId=${user.id} email=${email} reason=user_not_verified`);
      return { ...NO_TOKENS, success: false, failureReason: LoginFailureReason.NOT_VERIFIED, lockedUntil: '', requiresCaptcha: false };
    }

    if (user.blocked) {
      this.logger.warn(`Login failed: userId=${user.id} email=${email} reason=user_blocked`);
      return { ...NO_TOKENS, success: false, failureReason: LoginFailureReason.BLOCKED, lockedUntil: '', requiresCaptcha: false };
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      this.logger.warn(
        `Login rejected: userId=${user.id} email=${email} reason=account_locked lockedUntil=${user.lockedUntil.toISOString()}`,
      );
      return {
        ...NO_TOKENS,
        success: false,
        failureReason: LoginFailureReason.ACCOUNT_LOCKED,
        lockedUntil: user.lockedUntil.toISOString(),
        requiresCaptcha: false,
      };
    }

    if (!user.password) {
      this.logger.warn(`Login failed: userId=${user.id} email=${email} reason=password_not_configured`);
      return this.rejectInvalidCredentials(user, email);
    }

    const valid = await this.passwordService.verifyPassword(user.password, password);
    if (!valid) {
      return this.rejectInvalidCredentials(user, email);
    }

    // Smooth migration: rehash legacy passwords to Argon2id
    if (this.passwordService.needsRehash(user.password)) {
      const newHash = await this.passwordService.hashPassword(password);
      await this.userRepository.update(user.id, { password: newHash });
      this.logger.debug(`Migrated password hash for user "${email}" from HMAC-SHA256 to Argon2id`);
    }

    if (user.failedLoginAttempts || user.lockedUntil || user.failedLoginWindowStartedAt) {
      await this.userRepository.update(user.id, {
        failedLoginAttempts: 0,
        failedLoginWindowStartedAt: null,
        lockedUntil: null,
      });
    }

    const [accessToken, { token: refreshToken, expiresAt }] = await Promise.all([
      this.tokenIssuer.generateAccessToken({
        userId: user.id,
        roleId: user.roleId,
        roleType: user.roleType,
        language: user.language,
        tokenVersion: user.tokenVersion,
      }),
      this.tokenIssuer.generateRefreshToken({
        userId: user.id,
        roleId: user.roleId,
        roleType: user.roleType,
        language: user.language,
        tokenVersion: user.tokenVersion,
      }),
    ]);
    await this.refreshTokenRepository.create({
      userId: user.id,
      refreshToken,
      expiresAt,
      fingerprint: command.requestIp || 'unknown',
      userAgent: command.userAgent || 'unknown',
    });
    const csrfToken = this.tokenIssuer.generateCsrfToken();

    this.logger.log(`Login succeeded: userId=${user.id} email=${user.email}`);

    return {
      success: true,
      accessToken,
      refreshToken,
      csrfToken,
      userId: user.id,
      email: user.email,
      failureReason: '',
      lockedUntil: '',
      requiresCaptcha: false,
    };
  }

  private async rejectInvalidCredentials(user: AuthUser, email: string): Promise<LoginResponse> {
    const now = new Date();
    const failedLoginWindowStartedAt = this.resolveFailedLoginWindowStart(user.failedLoginWindowStartedAt, now);
    const failedLoginAttempts =
      failedLoginWindowStartedAt === user.failedLoginWindowStartedAt ? (user.failedLoginAttempts ?? 0) + 1 : 1;
    const shouldLock = failedLoginAttempts >= LOCK_ATTEMPT_THRESHOLD;
    const lockedUntil = shouldLock ? new Date(now.getTime() + LOCK_DURATION_MS) : null;

    await this.userRepository.update(user.id, {
      failedLoginAttempts,
      failedLoginWindowStartedAt,
      lockedUntil,
    });

    if (shouldLock && lockedUntil) {
      this.logger.warn(
        `Login failed and account locked: userId=${user.id} email=${email} failedLoginAttempts=${failedLoginAttempts} lockedUntil=${lockedUntil.toISOString()}`,
      );
      await this.queueAccountLockedEmail(user, lockedUntil);
    } else {
      this.logger.warn(
        `Login failed: userId=${user.id} email=${email} failedLoginAttempts=${failedLoginAttempts} failedLoginWindowStartedAt=${failedLoginWindowStartedAt.toISOString()}`,
      );
    }

    return {
      ...NO_TOKENS,
      success: false,
      failureReason: LoginFailureReason.INVALID_CREDENTIALS,
      lockedUntil: '',
      requiresCaptcha: failedLoginAttempts >= CAPTCHA_ATTEMPT_THRESHOLD,
    };
  }

  private resolveFailedLoginWindowStart(currentWindowStartedAt: Date | null | undefined, now: Date): Date {
    if (!currentWindowStartedAt) return now;
    const windowAgeMs = now.getTime() - currentWindowStartedAt.getTime();
    return windowAgeMs > FAILED_LOGIN_WINDOW_MS ? now : currentWindowStartedAt;
  }

  private async queueAccountLockedEmail(user: AuthUser, lockedUntil: Date): Promise<void> {
    try {
      await this.mailProducer.queueMail({
        to: user.email,
        subject: 'Security alert: account temporarily locked',
        template: 'notification',
        context: {
          title: 'Account temporarily locked',
          message:
            'We detected too many failed login attempts for your account. Login has been temporarily locked for security reasons.',
          lockedUntil: lockedUntil.toISOString(),
        },
      });
      this.logger.log(`Account lock email queued: userId=${user.id} email=${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue account lock email: userId=${user.id} email=${user.email} error=${(error as Error).message}`,
      );
    }
  }
}
