import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from '../../domain/repositories/user.repository';
import { PasswordResetTokenRepository } from '../../domain/repositories/password-reset-token.repository';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { MailService } from '@/modules/mail/infrastructure/services/mail.service';
import { MailRepository } from '@/modules/mail/domain/repositories/mail.repository';
import { Mail, MailTemplateType } from '@/modules/mail/domain';
import { AdminResetPasswordCommand } from '../commands/admin-reset-password.command';
import { AdminPasswordResetRequestedEvent } from '../events/auth.events';

@CommandHandler(AdminResetPasswordCommand)
export class AdminResetPasswordHandler implements ICommandHandler<AdminResetPasswordCommand> {
  private readonly logger = new Logger(AdminResetPasswordHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetTokenRepository: PasswordResetTokenRepository,
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute({ userId }: AdminResetPasswordCommand): Promise<{ success: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`Admin password reset rejected: userId=${userId} reason=user_not_found`);
      throw new NotFoundException('user.notFound');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for admin-initiated

    await this.resetTokenRepository.create(PasswordResetToken.create({ userId, token, expiresAt }));

    const baseUrl = this.configService.getOrThrow<string>('host.origin');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const mail = Mail.create({
      to: user.email,
      subject: 'Сброс пароля администратором',
      template: MailTemplateType.PASSWORD_RESET,
      context: { resetUrl, expiryMinutes: 1440 },
    });
    const savedMail = await this.mailRepository.create(mail);
    await this.mailService.addToQueue(savedMail);
    this.eventBus.publish(new AdminPasswordResetRequestedEvent(userId));
    this.logger.log(
      `Admin password reset requested: userId=${userId} email=${user.email} expiresAt=${expiresAt.toISOString()}`,
    );

    return { success: true };
  }
}
