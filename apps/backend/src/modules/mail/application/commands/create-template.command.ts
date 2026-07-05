import { Command } from '@nestjs/cqrs';

export class CreateTemplateCommand extends Command<string> {
  constructor(
    public readonly payload: {
      name: string;
      subject: string;
      content: string;
      isActive?: boolean;
    },
  ) {
    super();
  }
}
