import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { AuthTokenVersionService } from '../../infrastructure/services';
import { UserUpdateCommand } from '../commands';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@CommandHandler(UserUpdateCommand)
export class UserUpdateHandler implements ICommandHandler<UserUpdateCommand> {
  private readonly logger = new Logger(UserUpdateHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenVersionService: AuthTokenVersionService,
  ) {}

  async execute(command: UserUpdateCommand): Promise<UserDto> {
    const { userId, payload } = command;
    const previous = await this.userRepository.findById(userId);
    if (!previous) {
      this.logger.warn(`User update failed: userId=${userId} reason=user_not_found_before_update`);
      throw new NotFoundException('user.notFound');
    }

    await this.userRepository.update(userId, payload);

    if (this.shouldInvalidateAccessTokens(previous.roleId, previous.blocked, payload)) {
      const version = await this.tokenVersionService.bumpVersion(userId);
      this.logger.log(`User access tokens invalidated: userId=${userId} tokenVersion=${version}`);
    }

    const updated = await this.userRepository.findById(userId);
    if (!updated) {
      this.logger.warn(`User update failed: userId=${userId} reason=user_not_found_after_update`);
      throw new NotFoundException('user.notFound');
    }

    this.logger.log(`User updated: userId=${updated.id} email=${updated.email}`);
    return UserMapper.toDto(updated);
  }

  private shouldInvalidateAccessTokens(
    previousRoleId: string,
    previousBlocked: boolean,
    payload: UserUpdateCommand['payload'],
  ): boolean {
    const roleChanged = payload.roleId !== undefined && payload.roleId !== previousRoleId;
    const blockedChanged = payload.blocked !== undefined && payload.blocked !== previousBlocked;
    return roleChanged || blockedChanged;
  }
}
