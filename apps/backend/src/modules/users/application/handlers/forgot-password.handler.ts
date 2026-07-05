import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { MailService } from '@/modules/mail/infrastructure/services/mail.service';
import { MailRepository } from '@/modules/mail/domain/repositories/mail.repository';
import { Mail, MailTemplateType } from '@/modules/mail/domain';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';
import { PasswordResetRequestedEvent } from '../events/auth.events';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  private readonly logger = new Logger(ForgotPasswordHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ email }: ForgotPasswordCommand): Promise<{ success: boolean }> {
    this.logger.log(`Password reset requested: email=${email}`);
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.blocked) {
      this.logger.warn(
        `Password reset request accepted without email dispatch: email=${email} reason=${!user ? 'user_not_found' : 'user_blocked'}`,
      );
      this.eventBus.publish(new PasswordResetRequestedEvent(email));
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    const ttlMs = 60 * 60 * 1000; // 1 hour
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.resetTokenRepository.create(PasswordResetToken.create({ userId: user.id, token, expiresAt }));

    const baseUrl = this.configService.getOrThrow<string>('host.origin');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const mail = Mail.create({
      to: email,
      subject: 'Сброс пароля',
      template: MailTemplateType.PASSWORD_RESET,
      context: { resetUrl, expiryMinutes: 60 },
    });
    const savedMail = await this.mailRepository.create(mail);
    await this.mailService.addToQueue(savedMail);

    this.logger.log(
      `Password reset email queued: userId=${user.id} email=${email} expiresAt=${expiresAt.toISOString()}`,
    );
    this.eventBus.publish(new PasswordResetRequestedEvent(email, user.id));
    return { success: true };
  }
}
