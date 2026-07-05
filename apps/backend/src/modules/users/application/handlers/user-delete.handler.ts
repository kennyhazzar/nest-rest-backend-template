import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Status } from '@/enums/status.enum';
import { UserRepository } from '../../domain/repositories';
import { UserDeleteCommand } from '../commands';

@CommandHandler(UserDeleteCommand)
export class UserDeleteHandler implements ICommandHandler<UserDeleteCommand> {
  private readonly logger = new Logger(UserDeleteHandler.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UserDeleteCommand): Promise<Status> {
    const result = await this.userRepository.delete(command.userId);
    const status = result.affected && result.affected > 0 ? Status.OK : Status.ERROR;
    this.logger.log(`User delete processed: userId=${command.userId} status=${status}`);
    return status;
  }
}
