import { Query } from '@nestjs/cqrs';

import { UserDto } from '../../presentation/dtos';

export class UserGetByEmailQuery extends Query<UserDto> {
  constructor(public readonly email: string) {
    super();
  }
}
