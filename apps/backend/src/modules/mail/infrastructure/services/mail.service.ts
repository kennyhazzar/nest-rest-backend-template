import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

import { Mail, MailStatus } from '../../domain';
import { MailRepository, TemplateRepository } from '../../domain/repositories';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue('mail') private readonly mailQueue: Queue,
    private readonly mailerService: MailerService,
    private readonly mailRepository: MailRepository,
    private readonly templateRepository: TemplateRepository,
  ) {}

  async addToQueue(mail: Mail): Promise<void> {
    await this.mailQueue.add('send-mail', {
      mailId: mail.id,
      to: mail.to,
      subject: mail.subject,
      template: mail.template,
      context: mail.context,
    });
  }

  async sendMail(
    mailId: string,
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
  ): Promise<void> {
    try {
      // Получаем шаблон из базы данных
      const templateEntity = await this.templateRepository.findByName(template);

      if (!templateEntity) {
        throw new Error('mail.templateNotFound');
      }

      if (!templateEntity.isActive) {
        throw new Error('mail.templateInactive');
      }

      // Используем subject из шаблона, если не задан
      const finalSubject = subject || templateEntity.subject;

      // Компилируем шаблон: если есть content в БД - используем его, иначе читаем из .hbs файла
      let templateContent: string;
      if (templateEntity.content) {
        templateContent = templateEntity.content;
      } else {
        // Читаем .hbs файл из options/templates
        const templatePath = join(__dirname, '../../../../options/templates', `${template}.hbs`);
        try {
          templateContent = readFileSync(templatePath, 'utf-8');
        } catch {
          throw new Error('mail.templateFileNotFound');
        }
      }

      const compiledTemplate = Handlebars.compile(templateContent);
      const html = compiledTemplate(context);

      await this.mailerService.sendMail({
        to,
        subject: finalSubject,
        html,
      });

      // Обновляем статус на отправлено
      await this.mailRepository.update(mailId, {
        status: MailStatus.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      // Обновляем статус на неудачно
      const mail = await this.mailRepository.findById(mailId);
      await this.mailRepository.update(mailId, {
        status: MailStatus.FAILED,
        attempts: (mail?.attempts || 0) + 1,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Обработка очереди писем с параллельным выполнением
   * @param concurrency - максимальное количество одновременных отправок (по умолчанию 5)
   * @param batchSize - размер пакета для обработки (по умолчанию 50)
   */
  async processQueue(concurrency: number = 5, batchSize: number = 50): Promise<void> {
    const pendingMails = await this.mailRepository.findPendingMails();

    if (pendingMails.length === 0) {
      return;
    }

    // Обрабатываем письма пакетами для контроля памяти
    for (let i = 0; i < pendingMails.length; i += batchSize) {
      const batch = pendingMails.slice(i, i + batchSize);

      // Создаем пул промисов с ограничением concurrency
      const chunks = this.chunkArray(batch, concurrency);

      for (const chunk of chunks) {
        // Выполняем chunk параллельно
        await Promise.allSettled(
          chunk.map((mail) =>
            this.sendMail(mail.id, mail.to, mail.subject, mail.template, mail.context).catch((error) => {
              this.logger.error(
                `Failed to send mail ${mail.id}:`,
                error instanceof Error ? error.message : 'Unknown error',
              );
            }),
          ),
        );
      }
    }
  }

  /**
   * Разбивает массив на чанки указанного размера
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
