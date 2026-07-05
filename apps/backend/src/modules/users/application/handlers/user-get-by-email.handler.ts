import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserGetByEmailQuery } from '../queries';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@QueryHandler(UserGetByEmailQuery)
export class UserGetByEmailHandler implements IQueryHandler<UserGetByEmailQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: UserGetByEmailQuery): Promise<UserDto> {
    const user = await this.userRepository.findByEmail(query.email);
    if (!user) {
      throw new NotFoundException('user.notFound');
    }
    return UserMapper.toDto(user);
  }
}
