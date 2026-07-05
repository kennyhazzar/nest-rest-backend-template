import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories/user.repository';
import { UserUnlockCommand } from '../commands/user-unlock.command';

@CommandHandler(UserUnlockCommand)
export class UserUnlockHandler implements ICommandHandler<UserUnlockCommand> {
  private readonly logger = new Logger(UserUnlockHandler.name);

  constructor(private readonly userRepository: UserRepository) {}

  async execute({ userId }: UserUnlockCommand): Promise<{ success: boolean }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`User unlock failed: userId=${userId} reason=user_not_found`);
      throw new NotFoundException('user.notFound');
    }

    await this.userRepository.update(userId, {
      blocked: false,
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });

    this.logger.log(`User unlocked: userId=${userId} email=${user.email}`);
    return { success: true };
  }
}
