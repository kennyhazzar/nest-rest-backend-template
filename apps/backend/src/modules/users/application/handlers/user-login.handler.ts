import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';

import { Mail, MailTemplateType } from '@/modules/mail/domain';
import { MailRepository } from '@/modules/mail/domain/repositories/mail.repository';
import { MailService } from '@/modules/mail/infrastructure/services/mail.service';
import { UserRepository } from '../../domain/repositories';
import { AuthServiceAdapter } from '../../infrastructure/adapters';
import { PasswordService } from '../../domain/services/password.service';
import { UserLoginCommand } from '../commands';
import { User } from '../../domain/entities';
import { UserLoginFailedEvent, UserLoginSucceededEvent } from '../events/auth.events';

const CAPTCHA_ATTEMPT_THRESHOLD = 3;
const LOCK_ATTEMPT_THRESHOLD = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

@CommandHandler(UserLoginCommand)
export class LoginUserHandler implements ICommandHandler<UserLoginCommand> {
  private readonly logger = new Logger(LoginUserHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthServiceAdapter,
    private readonly passwordService: PasswordService,
    private readonly eventBus: EventBus,
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(command: UserLoginCommand): Promise<User> {
    const { email, password } = command.payload;

    const user = await this.userRepository.findByEmail(email, { includePassword: true });

    if (!user) {
      this.logger.warn(`User login failed: email=${email} reason=user_not_found`);
      this.eventBus.publish(new UserLoginFailedEvent(email));
      throw new UnauthorizedException('user.auth.invalidCredentials');
    }

    if (!user.verified) {
      this.logger.warn(`User login failed: userId=${user.id} email=${email} reason=user_not_verified`);
      this.eventBus.publish(new UserLoginFailedEvent(email));
      throw new UnauthorizedException('user.auth.verified');
    }

    if (user.blocked) {
      this.logger.warn(`User login failed: userId=${user.id} email=${email} reason=user_blocked`);
      this.eventBus.publish(new UserLoginFailedEvent(email));
      throw new UnauthorizedException('user.auth.blocked');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      this.logger.warn(
        `User login rejected: userId=${user.id} email=${email} reason=account_locked lockedUntil=${user.lockedUntil.toISOString()}`,
      );
      this.eventBus.publish(new UserLoginFailedEvent(email));
      throw new ForbiddenException({
        message: 'user.auth.accountLocked',
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    // If user has no password set, treat as invalid credentials (don't reveal account details)
    if (!user.password) {
      this.logger.warn(`User login failed: userId=${user.id} email=${email} reason=password_not_configured`);
      return await this.rejectInvalidCredentials(user, email, 'password_not_configured');
    }

    const passwordHash: string = user.password;
    const valid = await this.passwordService.verifyPassword(passwordHash, password);
    if (!valid) {
      await this.rejectInvalidCredentials(user, email, 'password_mismatch');
    }

    const updateOnSuccess: Partial<User> = {};

    // Smooth migration: rehash legacy passwords to Argon2id
    if (this.passwordService.needsRehash(passwordHash)) {
      updateOnSuccess.password = await this.passwordService.hashPassword(password);
      this.logger.debug(`Migrated password hash for user "${email}" from HMAC-SHA256 to Argon2id`);
    }

    if (user.failedLoginAttempts || user.lockedUntil || user.failedLoginWindowStartedAt) {
      updateOnSuccess.failedLoginAttempts = 0;
      updateOnSuccess.failedLoginWindowStartedAt = null;
      updateOnSuccess.lockedUntil = null;
    }

    if (Object.keys(updateOnSuccess).length) {
      await this.userRepository.update(user.id, updateOnSuccess);
    }

    this.eventBus.publish(new UserLoginSucceededEvent(user.id, user.email));
    this.logger.log(`User login succeeded: userId=${user.id} email=${user.email}`);
    return user;
  }

  private async rejectInvalidCredentials(user: User, email: string, reason: string): Promise<never> {
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
        `User login failed and account locked: userId=${user.id} email=${email} reason=${reason} failedLoginAttempts=${failedLoginAttempts} failedLoginWindowStartedAt=${failedLoginWindowStartedAt.toISOString()} lockedUntil=${lockedUntil.toISOString()}`,
      );
      await this.queueAccountLockedEmail(user, lockedUntil);
    } else {
      this.logger.warn(
        `User login failed: userId=${user.id} email=${email} reason=${reason} failedLoginAttempts=${failedLoginAttempts} failedLoginWindowStartedAt=${failedLoginWindowStartedAt.toISOString()}`,
      );
    }

    this.eventBus.publish(new UserLoginFailedEvent(email));
    throw new UnauthorizedException({
      message: 'user.auth.invalidCredentials',
      requiresCaptcha: failedLoginAttempts >= CAPTCHA_ATTEMPT_THRESHOLD,
    });
  }

  private resolveFailedLoginWindowStart(currentWindowStartedAt: Date | null | undefined, now: Date): Date {
    if (!currentWindowStartedAt) return now;
    const windowAgeMs = now.getTime() - currentWindowStartedAt.getTime();
    return windowAgeMs > FAILED_LOGIN_WINDOW_MS ? now : currentWindowStartedAt;
  }

  private async queueAccountLockedEmail(user: User, lockedUntil: Date): Promise<void> {
    try {
      const mail = Mail.create({
        to: user.email,
        subject: 'Security alert: account temporarily locked',
        template: MailTemplateType.NOTIFICATION,
        context: {
          title: 'Account temporarily locked',
          message:
            'We detected too many failed login attempts for your account. Login has been temporarily locked for security reasons.',
          lockedUntil: lockedUntil.toISOString(),
        },
      });
      const savedMail = await this.mailRepository.create(mail);
      await this.mailService.addToQueue(savedMail);
      this.logger.log(`Account lock email queued: userId=${user.id} email=${user.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue account lock email: userId=${user.id} email=${user.email} error=${(error as Error).message}`,
      );
    }
  }
}
