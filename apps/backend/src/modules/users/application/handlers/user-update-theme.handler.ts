import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserUpdateThemeCommand } from '../commands';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@CommandHandler(UserUpdateThemeCommand)
export class UserUpdateThemeHandler implements ICommandHandler<UserUpdateThemeCommand> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(command: UserUpdateThemeCommand): Promise<UserDto> {
    const { userId, payload } = command;

    await this.userRepository.update(userId, { theme: payload.theme });

    const updated = await this.userRepository.findById(userId);
    if (!updated) {
      throw new NotFoundException('user.notFound');
    }

    return UserMapper.toDto(updated);
  }
}
