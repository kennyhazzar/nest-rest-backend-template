import { Command } from '@nestjs/cqrs';
import { ChangePasswordResponse } from '@libs/contracts/auth';

export class ChangePasswordCommand extends Command<ChangePasswordResponse> {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {
    super();
  }
}
