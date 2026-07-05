import { Command } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { Status } from '@/enums/status.enum';

export class UserDeleteCommand extends Command<Status> {
  constructor(public readonly userId: IdType) {
    super();
  }
}
