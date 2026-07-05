import { Query } from '@nestjs/cqrs';
import { MailStatus } from '../../domain/enums/mail-status.enum';
import { MailListItem } from '../handlers/get-mails-by-status.handler';

export class GetMailsByStatusQuery extends Query<MailListItem[]> {
  constructor(public readonly status: MailStatus) {
    super();
  }
}
