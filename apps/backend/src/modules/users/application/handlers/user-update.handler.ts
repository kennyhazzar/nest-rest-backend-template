import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserUpdateCommand } from '../commands';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@CommandHandler(UserUpdateCommand)
export class UserUpdateHandler implements ICommandHandler<UserUpdateCommand> {
  private readonly logger = new Logger(UserUpdateHandler.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UserUpdateCommand): Promise<UserDto> {
    const { userId, payload } = command;

    await this.userRepository.update(userId, payload);

    const updated = await this.userRepository.findById(userId);
    if (!updated) {
      this.logger.warn(`User update failed: userId=${userId} reason=user_not_found_after_update`);
      throw new NotFoundException('user.notFound');
    }

    this.logger.log(`User updated: userId=${updated.id} email=${updated.email}`);
    return UserMapper.toDto(updated);
  }
}
