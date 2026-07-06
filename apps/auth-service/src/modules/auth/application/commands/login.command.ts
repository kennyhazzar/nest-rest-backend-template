import { Command } from '@nestjs/cqrs';
import { LoginResponse } from '@libs/contracts/auth';

export class LoginCommand extends Command<LoginResponse> {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly requestIp: string,
    public readonly userAgent: string,
  ) {
    super();
  }
}
