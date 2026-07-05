import { Command } from '@nestjs/cqrs';

import { User } from '../../domain/entities';
import { LoginBody } from '../../presentation/dtos';

export class UserLoginCommand extends Command<User> {
  constructor(public readonly payload: LoginBody) {
    super();
  }
}
