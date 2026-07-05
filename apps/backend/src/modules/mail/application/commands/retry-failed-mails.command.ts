import { Command } from '@nestjs/cqrs';

export class RetryFailedMailsCommand extends Command<number> {
  constructor() {
    super();
  }
}
