import { Command } from '@nestjs/cqrs';

import { CreateUserRoleBody, UserRoleDto } from '../../presentation/dtos';

export class UserRoleCreateCommand extends Command<UserRoleDto> {
  constructor(public readonly payload: CreateUserRoleBody) {
    super();
  }
}
