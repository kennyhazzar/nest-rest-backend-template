import { Command } from '@nestjs/cqrs';

/**
 * Command to request a magic link for passwordless authentication
 */
export class MagicLinkRequestCommand extends Command<{ success: boolean }> {
  constructor(
    public readonly email: string,
    public readonly fingerprint: string,
    public readonly userAgent: string,
  ) {
    super();
  }
}
