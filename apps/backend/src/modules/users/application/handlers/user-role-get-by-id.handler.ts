import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { UserRoleRepository } from '../../domain/repositories';
import { UserRoleGetByIdQuery } from '../queries';
import { UserRoleDto } from '../../presentation/dtos';
import { UserRoleMapper } from '../../presentation/mappers';

@QueryHandler(UserRoleGetByIdQuery)
export class UserRoleGetByIdHandler implements IQueryHandler<UserRoleGetByIdQuery> {
  constructor(private readonly userRoleRepository: UserRoleRepository) {}

  async execute(query: UserRoleGetByIdQuery): Promise<UserRoleDto> {
    const role = await this.userRoleRepository.findById(query.roleId);
    if (!role) {
      throw new NotFoundException('user.role.notFound');
    }
    return UserRoleMapper.toDto(role);
  }
}
