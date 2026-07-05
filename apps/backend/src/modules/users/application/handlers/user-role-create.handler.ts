import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRoleRepository } from '../../domain/repositories';
import { UserRoleCreateCommand } from '../commands';
import { UserRoleDto } from '../../presentation/dtos';
import { UserRoleMapper } from '../../presentation/mappers';

@CommandHandler(UserRoleCreateCommand)
export class UserRoleCreateHandler implements ICommandHandler<UserRoleCreateCommand> {
  constructor(private readonly userRoleRepository: UserRoleRepository) {}

  async execute(command: UserRoleCreateCommand): Promise<UserRoleDto> {
    const role = await this.userRoleRepository.create(command.payload);
    return UserRoleMapper.toDto(role);
  }
}
