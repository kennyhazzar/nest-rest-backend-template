import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { UserUpdateNotificationChannelsCommand } from '../commands';

@CommandHandler(UserUpdateNotificationChannelsCommand)
export class UserUpdateNotificationChannelsHandler implements ICommandHandler<UserUpdateNotificationChannelsCommand> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute({ userId, channels }: UserUpdateNotificationChannelsCommand): Promise<void> {
    await this.userRepository.update(userId, { notificationChannels: channels });
  }
}
