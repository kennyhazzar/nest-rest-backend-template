import { IEvent } from '@nestjs/cqrs';
import { IdType } from '@/interfaces/id.type';

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly userId: IdType,
    public readonly email: string,
    public readonly name: string,
    public readonly surname?: string,
  ) {}
}
