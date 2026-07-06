import { Command } from '@nestjs/cqrs';
import { LogoutResponse } from '@libs/contracts/auth';

export class LogoutCommand extends Command<LogoutResponse> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
