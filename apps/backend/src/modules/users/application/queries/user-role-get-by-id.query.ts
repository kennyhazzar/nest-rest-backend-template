import { Query } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { UserRoleDto } from '../../presentation/dtos';

export class UserRoleGetByIdQuery extends Query<UserRoleDto> {
  constructor(public readonly roleId: IdType) {
    super();
  }
}
