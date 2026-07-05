import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';

import { MailRepository } from '../../domain';
import { GetMailStatusQuery } from '../queries/get-mail-status.query';

export interface MailStatusResult {
  id: string;
  status: string;
  attempts: number;
  createdAt: Date;
  sentAt?: Date;
  errorMessage?: string;
}

@QueryHandler(GetMailStatusQuery)
export class GetMailStatusHandler implements IQueryHandler<GetMailStatusQuery> {
  constructor(private readonly mailRepository: MailRepository) {}

  async execute(query: GetMailStatusQuery): Promise<MailStatusResult> {
    const mail = await this.mailRepository.findById(query.mailId);

    if (!mail) {
      throw new NotFoundException('mail.notFound');
    }

    return {
      id: mail.id,
      status: mail.status,
      attempts: mail.attempts,
      createdAt: mail.createdAt,
      sentAt: mail.sentAt,
      errorMessage: mail.errorMessage,
    };
  }
}
