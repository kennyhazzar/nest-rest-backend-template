import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Status } from '@/enums/status.enum';
import { UserRoleRepository } from '../../domain/repositories';
import { UserRoleDeleteCommand } from '../commands';

@CommandHandler(UserRoleDeleteCommand)
export class UserRoleDeleteHandler implements ICommandHandler<UserRoleDeleteCommand> {
  constructor(private readonly userRoleRepository: UserRoleRepository) {}

  async execute(command: UserRoleDeleteCommand): Promise<Status> {
    const result = await this.userRoleRepository.delete(command.roleId);
    return result.affected && result.affected > 0 ? Status.OK : Status.ERROR;
  }
}
