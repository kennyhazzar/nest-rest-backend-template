import { Query } from '@nestjs/cqrs';

import { UserDto } from '../../presentation/dtos';
import { UserFilter, UserFindOneOptions } from '../../domain/repositories/user.filter';

export class UserGetQuery extends Query<UserDto> {
  constructor(
    public readonly filter: UserFilter,
    public readonly options?: UserFindOneOptions,
  ) {
    super();
  }
}
