import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { MailRepository } from '../../domain';
import { GetMailsByStatusQuery } from '../queries/get-mails-by-status.query';

export interface MailListItem {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: string;
  attempts: number;
  createdAt: Date;
  sentAt?: Date;
}

@QueryHandler(GetMailsByStatusQuery)
export class GetMailsByStatusHandler implements IQueryHandler<GetMailsByStatusQuery> {
  constructor(private readonly mailRepository: MailRepository) {}

  async execute(query: GetMailsByStatusQuery): Promise<MailListItem[]> {
    const mails = await this.mailRepository.findByStatus(query.status);

    return mails.map((mail) => ({
      id: mail.id,
      to: mail.to,
      subject: mail.subject,
      template: mail.template,
      status: mail.status,
      attempts: mail.attempts,
      createdAt: mail.createdAt,
      sentAt: mail.sentAt,
    }));
  }
}
