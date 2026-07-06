import { Command } from '@nestjs/cqrs';
import { RefreshTokensResponse } from '@libs/contracts/auth';

export class RefreshTokensCommand extends Command<RefreshTokensResponse> {
  constructor(
    public readonly refreshToken: string,
    public readonly requestIp: string,
    public readonly userAgent: string,
  ) {
    super();
  }
}
