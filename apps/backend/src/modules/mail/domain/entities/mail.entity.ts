import { MailTemplateType, MailStatus } from '../enums';

export class Mail {
  constructor(
    public readonly id: string,
    public readonly to: string,
    public readonly subject: string,
    public readonly template: MailTemplateType,
    public readonly context: Record<string, any>,
    public readonly status: MailStatus,
    public readonly attempts: number,
    public readonly createdAt: Date,
    public readonly sentAt?: Date,
    public readonly errorMessage?: string,
  ) {}

  static create(payload: {
    to: string;
    subject: string;
    template: MailTemplateType;
    context: Record<string, any>;
  }): Omit<Mail, 'id'> {
    return {
      to: payload.to,
      subject: payload.subject,
      template: payload.template,
      context: payload.context,
      status: MailStatus.PENDING,
      attempts: 0,
      createdAt: new Date(),
    } as Omit<Mail, 'id'>;
  }

  markAsSent(): Mail {
    return new Mail(
      this.id,
      this.to,
      this.subject,
      this.template,
      this.context,
      MailStatus.SENT,
      this.attempts,
      this.createdAt,
      new Date(),
      this.errorMessage,
    );
  }

  markAsFailed(errorMessage: string): Mail {
    return new Mail(
      this.id,
      this.to,
      this.subject,
      this.template,
      this.context,
      MailStatus.FAILED,
      this.attempts + 1,
      this.createdAt,
      this.sentAt,
      errorMessage,
    );
  }

  canRetry(): boolean {
    return this.status === MailStatus.FAILED && this.attempts < 5;
  }

  markForRetry(): Mail {
    return new Mail(
      this.id,
      this.to,
      this.subject,
      this.template,
      this.context,
      MailStatus.PENDING,
      this.attempts,
      this.createdAt,
      this.sentAt,
      this.errorMessage,
    );
  }
}
