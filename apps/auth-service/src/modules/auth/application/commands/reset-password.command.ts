import { Command } from '@nestjs/cqrs';
import { ResetPasswordResponse } from '@libs/contracts/auth';

export class ResetPasswordCommand extends Command<ResetPasswordResponse> {
  constructor(
    public readonly token: string,
    public readonly newPassword: string,
  ) {
    super();
  }
}
