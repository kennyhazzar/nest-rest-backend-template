import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRoleRepository } from '../../domain/repositories';
import { UserRoleUpdateCommand } from '../commands';
import { UserRoleDto } from '../../presentation/dtos';
import { UserRoleMapper } from '../../presentation/mappers';

@CommandHandler(UserRoleUpdateCommand)
export class UserRoleUpdateHandler implements ICommandHandler<UserRoleUpdateCommand> {
  constructor(private readonly userRoleRepository: UserRoleRepository) {}

  async execute(command: UserRoleUpdateCommand): Promise<UserRoleDto> {
    const { roleId, payload } = command;

    await this.userRoleRepository.update(roleId, payload);

    const updated = await this.userRoleRepository.findById(roleId);
    if (!updated) {
      throw new NotFoundException('user.role.notFound');
    }

    return UserRoleMapper.toDto(updated);
  }
}
