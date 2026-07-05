import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { MagicLinkRequestCommand } from '../commands/magic-link-request.command';
import { MagicLinkTokenRepository } from '../../domain/repositories/magic-link-token.repository';
import { MagicLinkToken } from '../../domain/entities/magic-link-token.entity';
import { MailService } from '@/modules/mail/infrastructure/services/mail.service';
import { MailRepository } from '@/modules/mail/domain/repositories/mail.repository';
import { Mail, MailTemplateType } from '@/modules/mail/domain';

/**
 * Handler for requesting a magic link
 * Generates a token and sends it via email
 */
@CommandHandler(MagicLinkRequestCommand)
export class MagicLinkRequestHandler implements ICommandHandler<MagicLinkRequestCommand> {
  private readonly logger = new Logger(MagicLinkRequestHandler.name);

  constructor(
    private readonly magicLinkTokenRepository: MagicLinkTokenRepository,
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: MagicLinkRequestCommand): Promise<{ success: boolean }> {
    const { email, fingerprint, userAgent } = command;

    this.logger.log(`Magic link requested: email=${email}`);

    // Generate unique token
    const token = randomUUID();

    // Get TTL from config (default: 10 minutes = 600000ms)
    const ttl = this.configService.get<number>('magicLink.ttl', 600000);
    const expiresAt = new Date(Date.now() + ttl);

    // Create token record
    const tokenData = MagicLinkToken.create({
      email,
      token,
      expiresAt,
      fingerprint,
      userAgent,
    });

    await this.magicLinkTokenRepository.create(tokenData);

    // Build magic link URL
    const baseUrl = this.configService.getOrThrow<string>('magicLink.baseUrl');
    const loginUrl = `${baseUrl}?token=${token}`;

    // Send email
    const mail = Mail.create({
      to: email,
      subject: 'Your Login Link',
      template: MailTemplateType.MAGIC_LINK_LOGIN,
      context: {
        loginUrl,
        expiryMinutes: Math.floor(ttl / 60000),
      },
    });

    const savedMail = await this.mailRepository.create(mail);
    await this.mailService.addToQueue(savedMail);

    this.logger.log(`Magic link email queued: email=${email} expiresAt=${expiresAt.toISOString()}`);

    // Always return success (don't reveal if email exists or not for security)
    return { success: true };
  }
}
