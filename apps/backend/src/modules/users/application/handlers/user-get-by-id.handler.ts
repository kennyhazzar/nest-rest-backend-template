import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserGetByIdQuery } from '../queries';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@QueryHandler(UserGetByIdQuery)
export class UserGetByIdHandler implements IQueryHandler<UserGetByIdQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: UserGetByIdQuery): Promise<UserDto> {
    const user = await this.userRepository.findById(query.userId);
    if (!user) {
      throw new NotFoundException('user.notFound');
    }
    return UserMapper.toDto(user);
  }
}
