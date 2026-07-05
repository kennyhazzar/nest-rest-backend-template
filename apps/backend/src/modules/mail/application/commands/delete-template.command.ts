import { Command } from '@nestjs/cqrs';

export class DeleteTemplateCommand extends Command<void> {
  constructor(public readonly id: string) {
    super();
  }
}
