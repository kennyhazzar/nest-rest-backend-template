import { CommandBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';

import { NotificationType } from '@/enums/notification-type.enum';
import { SendMailCommand } from '@/modules/mail/application/commands/send-mail.command';
import { MailTemplateType } from '@/modules/mail/domain/enums/mail-template-type.enum';
import { User } from '@/modules/users/domain/entities';
import { UserRepository } from '@/modules/users/domain/repositories';
import { Notification } from '../../domain/entities';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationDispatchProcessor } from './notification-dispatch.processor';

describe('NotificationDispatchProcessor', () => {
  let processor: NotificationDispatchProcessor;
  let userRepository: jest.Mocked<UserRepository>;
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let commandBus: jest.Mocked<CommandBus>;

  const notification = new Notification({
    id: 'notification-1',
    userId: 'user-1',
    title: 'Disk space low',
    content: 'Disk usage on server-1 exceeded 90%',
    type: NotificationType.WARNING,
    channel: NotificationChannel.EMAIL,
    status: NotificationDeliveryStatus.PENDING,
    attempts: 0,
    isRead: false,
    metadata: { entityId: 'entity-1' },
  });

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
    };

    notificationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      findPendingForDispatch: jest.fn(),
      getUnreadCount: jest.fn(),
      markDispatchSent: jest.fn(),
      markDispatchFailed: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
    };

    commandBus = {
      execute: jest.fn(),
    };

    processor = new NotificationDispatchProcessor(userRepository, notificationRepository, commandBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const makeJob = (overrides: Partial<Job> = {}): Job =>
    ({
      data: {
        notificationId: notification.id,
        userId: notification.userId,
        title: notification.title,
        content: notification.content,
        type: notification.type,
        channel: notification.channel,
        metadata: notification.metadata,
      },
      attemptsMade: 0,
      opts: { attempts: 5 },
      ...overrides,
    }) as Job;

  it('sends email through CommandBus and marks notification as sent', async () => {
    const user = User.create({
      id: notification.userId,
      email: 'client@example.com',
      name: 'Client',
      surname: 'User',
      password: 'hashed',
      roleId: 'client-role',
    });
    notificationRepository.findById.mockResolvedValue(notification);
    userRepository.findById.mockResolvedValue(user);
    commandBus.execute.mockResolvedValue('mail-id');

    await processor.process(makeJob());

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          to: user.email,
          subject: notification.title,
          template: MailTemplateType.NOTIFICATION,
          context: { title: notification.title, content: notification.content },
          notificationId: notification.id,
        },
      }) as SendMailCommand,
    );
    expect(notificationRepository.markDispatchSent).toHaveBeenCalledWith(notification.id);
    expect(notificationRepository.markDispatchFailed).not.toHaveBeenCalled();
  });

  it('skips notifications that are no longer pending', async () => {
    notificationRepository.findById.mockResolvedValue(
      new Notification({
        ...notification,
        status: NotificationDeliveryStatus.SENT,
      }),
    );

    await processor.process(makeJob());

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(notificationRepository.markDispatchSent).not.toHaveBeenCalled();
    expect(notificationRepository.markDispatchFailed).not.toHaveBeenCalled();
  });

  it('marks unsupported channels as failed without retry', async () => {
    notificationRepository.findById.mockResolvedValue(
      new Notification({
        ...notification,
        channel: NotificationChannel.TELEGRAM,
      }),
    );

    await processor.process(
      makeJob({
        data: {
          ...makeJob().data,
          channel: NotificationChannel.TELEGRAM,
        },
      }),
    );

    expect(notificationRepository.markDispatchFailed).toHaveBeenCalledWith(
      notification.id,
      `Unsupported notification channel: ${NotificationChannel.TELEGRAM}`,
      null,
    );
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('stores a retry timestamp and rethrows while attempts remain', async () => {
    notificationRepository.findById.mockResolvedValue(notification);
    userRepository.findById.mockResolvedValue(null);

    await expect(processor.process(makeJob())).rejects.toThrow(`User ${notification.userId} not found`);

    expect(notificationRepository.markDispatchFailed).toHaveBeenCalledWith(
      notification.id,
      `User ${notification.userId} not found`,
      expect.any(Date),
    );
  });

  it('marks final failure without rethrowing when attempts are exhausted', async () => {
    notificationRepository.findById.mockResolvedValue(notification);
    userRepository.findById.mockResolvedValue(null);

    await expect(processor.process(makeJob({ attemptsMade: 4, opts: { attempts: 5 } }))).resolves.toBeUndefined();

    expect(notificationRepository.markDispatchFailed).toHaveBeenCalledWith(
      notification.id,
      `User ${notification.userId} not found`,
      null,
    );
  });
});
