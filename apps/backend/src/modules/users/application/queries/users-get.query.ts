import { Query } from '@nestjs/cqrs';

import { UsersDto } from '../../presentation/dtos';
import { UserFilter } from '../../domain/repositories/user.filter';

export interface UsersQueryFilter extends Omit<UserFilter, 'limit' | 'offset'> {
  page?: number;
  per_page?: number;
}

export class UsersGetQuery extends Query<UsersDto> {
  constructor(public readonly filter?: UsersQueryFilter) {
    super();
  }
}
