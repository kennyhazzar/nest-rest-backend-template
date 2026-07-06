import { randomBytes } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { ForgotPasswordResponse } from '@libs/contracts/auth';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { MailProducerService } from '../../infrastructure/services/mail-producer.service';
import { ForgotPasswordCommand } from '../commands/forgot-password.command';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler implements ICommandHandler<ForgotPasswordCommand> {
  private readonly logger = new Logger(ForgotPasswordHandler.name);

  constructor(
    private readonly userRepository: AuthUserRepository,
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly mailProducer: MailProducerService,
    private readonly configService: ConfigService,
  ) {}

  async execute({ email }: ForgotPasswordCommand): Promise<ForgotPasswordResponse> {
    this.logger.log(`Password reset requested: email=${email}`);
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.blocked) {
      this.logger.warn(
        `Password reset request accepted without email dispatch: email=${email} reason=${!user ? 'user_not_found' : 'user_blocked'}`,
      );
      return { success: true, userId: '' };
    }

    const token = randomBytes(32).toString('hex');
    const ttlMs = 60 * 60 * 1000; // 1 hour
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.resetTokenRepository.create(PasswordResetToken.create({ userId: user.id, token, expiresAt }));

    const baseUrl = this.configService.getOrThrow<string>('host.origin');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await this.mailProducer.queueMail({
      to: email,
      subject: 'Сброс пароля',
      template: 'reset-password',
      context: { resetUrl, expiryMinutes: 60 },
    });

    this.logger.log(
      `Password reset email queued: userId=${user.id} email=${email} expiresAt=${expiresAt.toISOString()}`,
    );
    return { success: true, userId: user.id };
  }
}
