import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';

import { Mail, MailRepository } from '../../domain';
import { SendMailCommand } from '../commands/send-mail.command';
import { MailService } from '../../infrastructure/services/mail.service';

@CommandHandler(SendMailCommand)
export class SendMailHandler implements ICommandHandler<SendMailCommand> {
  constructor(
    private readonly mailRepository: MailRepository,
    private readonly mailService: MailService,
  ) {}

  async execute(command: SendMailCommand): Promise<string> {
    const { to, subject, template, context } = command.payload;

    // Валидация
    if (!to || !subject || !template) {
      throw new BadRequestException('mail.sendRequiredFields');
    }

    // Создание письма
    const mail = Mail.create({
      to,
      subject,
      template,
      context,
    });

    // Сохранение в базу
    const savedMail = await this.mailRepository.create(mail);

    // Добавление в очередь для отправки
    await this.mailService.addToQueue(savedMail);

    return savedMail.id;
  }
}
