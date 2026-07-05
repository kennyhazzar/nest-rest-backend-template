import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserGetQuery } from '../queries';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@QueryHandler(UserGetQuery)
export class UserGetHandler implements IQueryHandler<UserGetQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: UserGetQuery): Promise<UserDto> {
    const user = await this.userRepository.findOne(query.filter, query.options);
    if (!user) {
      throw new NotFoundException('user.notFound');
    }
    return UserMapper.toDto(user);
  }
}
