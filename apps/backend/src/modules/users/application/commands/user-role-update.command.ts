import { Command } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { UserRoleDto, UpdateUserRoleBody } from '../../presentation/dtos';

export class UserRoleUpdateCommand extends Command<UserRoleDto> {
  constructor(
    public readonly roleId: IdType,
    public readonly payload: UpdateUserRoleBody,
  ) {
    super();
  }
}
