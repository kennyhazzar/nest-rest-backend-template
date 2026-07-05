import { Command } from '@nestjs/cqrs';

import { CreateUserBody, UserDto } from '../../presentation/dtos';

export class UserCreateCommand extends Command<UserDto> {
  constructor(public readonly payload: CreateUserBody) {
    super();
  }
}
