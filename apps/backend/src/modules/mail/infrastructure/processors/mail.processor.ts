import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { MailService } from '../services/mail.service';

interface SendMailJobData {
  mailId: string;
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Processor('mail')
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<SendMailJobData>): Promise<void> {
    const { mailId, to, subject, template, context } = job.data;

    await this.mailService.sendMail(mailId, to, subject, template, context);
  }
}
