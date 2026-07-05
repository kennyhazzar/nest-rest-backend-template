import { Command } from '@nestjs/cqrs';
import { AuthResponseDto } from '../../presentation/dtos/auth.dto';

/**
 * Command to authenticate a user using a magic link token
 */
export class MagicLinkAuthenticateCommand extends Command<AuthResponseDto> {
  constructor(
    public readonly token: string,
    public readonly fingerprint: string,
  ) {
    super();
  }
}
