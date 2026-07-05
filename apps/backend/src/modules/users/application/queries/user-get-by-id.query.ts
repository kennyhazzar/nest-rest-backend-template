import { Query } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { UserDto } from '../../presentation/dtos';

export class UserGetByIdQuery extends Query<UserDto> {
  constructor(public readonly userId: IdType) {
    super();
  }
}
