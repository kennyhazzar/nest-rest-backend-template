import { Query } from '@nestjs/cqrs';
import { MailStatusResult } from '../handlers/get-mail-status.handler';

export class GetMailStatusQuery extends Query<MailStatusResult> {
  constructor(public readonly mailId: string) {
    super();
  }
}
