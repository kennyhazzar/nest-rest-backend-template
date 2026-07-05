import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserCreatedEvent } from '@/modules/users/application/events';
import { NotificationCreateCommand } from '../../commands/notification-create.command';
import { NotificationType } from '@/enums/notification-type.enum';

@EventsHandler(UserCreatedEvent)
export class UserCreatedEventHandler implements IEventHandler<UserCreatedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserCreatedEvent): Promise<void> {
    const { userId, name, surname } = event;
    const fullName = surname ? `${name} ${surname}` : name;

    await this.commandBus.execute(
      new NotificationCreateCommand({
        userId,
        title: 'Welcome!',
        content: `Hello, ${fullName}! Your account has been created.`,
        type: NotificationType.SUCCESS,
        metadata: {
          eventType: 'user_created',
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }
}
