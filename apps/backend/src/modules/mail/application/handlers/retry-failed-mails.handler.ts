import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { MailRepository, MailStatus } from '../../domain';
import { RetryFailedMailsCommand } from '../commands/retry-failed-mails.command';
import { MailService } from '../../infrastructure/services/mail.service';

@CommandHandler(RetryFailedMailsCommand)
export class RetryFailedMailsHandler implements ICommandHandler<RetryFailedMailsCommand> {
  constructor(
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(): Promise<number> {
    const failedMails = await this.mailRepository.findFailedMails();
    const retryableMails = failedMails.filter((mail) => mail.canRetry());

    for (const mail of retryableMails) {
      await this.mailRepository.update(mail.id, { status: MailStatus.PENDING });
      await this.mailService.addToQueue(mail);
    }

    return retryableMails.length;
  }
}
