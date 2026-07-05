import { Query } from '@nestjs/cqrs';

import { UserRolesDto } from '../../presentation/dtos';
import { UserRoleFilter } from '../../domain/repositories/user-role.filter';

export interface UserRolesQueryFilter extends Omit<UserRoleFilter, 'limit' | 'offset'> {
  page?: number;
  per_page?: number;
}

export class UserRolesGetQuery extends Query<UserRolesDto> {
  constructor(public readonly filter?: UserRolesQueryFilter) {
    super();
  }
}
