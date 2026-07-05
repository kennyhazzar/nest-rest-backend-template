import { Command } from '@nestjs/cqrs';
import { MailTemplateType } from '../../domain';

export class SendMailCommand extends Command<string> {
  constructor(
    public readonly payload: {
      to: string;
      subject: string;
      template: MailTemplateType;
      context: Record<string, any>;
      notificationId?: string;
    },
  ) {
    super();
  }
}
