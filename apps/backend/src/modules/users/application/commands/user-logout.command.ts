import { Command } from '@nestjs/cqrs';

export class UserLogoutCommand extends Command<boolean> {
  constructor(public readonly refreshToken: string) {
    super();
  }
}
