import { Command } from '@nestjs/cqrs';

export class UpdateTemplateCommand extends Command<string> {
  constructor(
    public readonly id: string,
    public readonly payload: {
      subject?: string;
      content?: string;
      isActive?: boolean;
    },
  ) {
    super();
  }
}
