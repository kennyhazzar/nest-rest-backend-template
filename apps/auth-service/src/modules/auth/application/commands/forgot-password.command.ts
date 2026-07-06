import { Command } from '@nestjs/cqrs';
import { ForgotPasswordResponse } from '@libs/contracts/auth';

export class ForgotPasswordCommand extends Command<ForgotPasswordResponse> {
  constructor(public readonly email: string) {
    super();
  }
}
