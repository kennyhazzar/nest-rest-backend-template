import { Mail } from '../entities/mail.entity';
import { MailStatus } from '../enums/mail-status.enum';

export abstract class MailRepository {
  abstract create(mail: Omit<Mail, 'id'>): Promise<Mail>;

  abstract findById(id: string): Promise<Mail | null>;

  abstract findByStatus(status: MailStatus): Promise<Mail[]>;

  abstract update(mailId: string, update: Partial<Mail>): Promise<Mail>;

  abstract delete(id: string): Promise<void>;

  abstract findPendingMails(): Promise<Mail[]>;

  abstract findFailedMails(): Promise<Mail[]>;
}
