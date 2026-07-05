import { Command } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { UserDto, UpdateUserBody } from '../../presentation/dtos';

export class UserUpdateCommand extends Command<UserDto> {
  constructor(
    public readonly userId: IdType,
    public readonly payload: UpdateUserBody,
  ) {
    super();
  }
}
