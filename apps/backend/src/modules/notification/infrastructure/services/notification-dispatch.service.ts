import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { NotificationType } from '@/enums/notification-type.enum';
import { IdType } from '@/interfaces/id.type';
import { NotificationChannel } from '../../domain/enums';

export interface NotificationDispatchJobData {
  notificationId: IdType;
  userId: IdType;
  title: string;
  content: string;
  type: NotificationType;
  channel: NotificationChannel;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class NotificationDispatchService {
  constructor(@InjectQueue('notifications') private readonly queue: Queue) {}

  async enqueue(data: NotificationDispatchJobData): Promise<void> {
    await this.queue.add('dispatch', data, {
      jobId: String(data.notificationId),
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
