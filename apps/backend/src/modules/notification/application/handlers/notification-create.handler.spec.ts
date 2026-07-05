import { NotificationType } from '@/enums/notification-type.enum';
import { NotificationCreateHandler } from './notification-create.handler';
import { NotificationCreateCommand } from '../commands/notification-create.command';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { Notification } from '../../domain/entities';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';
import { NotificationDispatchService } from '../../infrastructure/services/notification-dispatch.service';

describe('NotificationCreateHandler', () => {
  let handler: NotificationCreateHandler;
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let dispatchService: jest.Mocked<NotificationDispatchService>;
  let queryBus: { execute: jest.Mock };

  const basePayload = {
    userId: 'user-1',
    title: 'Disk space low',
    content: 'Disk usage on server-1 exceeded 90%',
    type: NotificationType.WARNING,
    metadata: { entityId: 'entity-1' },
  };

  beforeEach(() => {
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

    dispatchService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    queryBus = { execute: jest.fn().mockResolvedValue({ id: basePayload.userId }) };

    handler = new NotificationCreateHandler(notificationRepository, dispatchService, queryBus as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createNotification = (id: string, channel: NotificationChannel, status: NotificationDeliveryStatus) =>
    new Notification({
      id,
      ...basePayload,
      channel,
      status,
      attempts: 0,
      sentAt: status === NotificationDeliveryStatus.SENT ? new Date('2026-06-30T00:00:00.000Z') : null,
      isRead: false,
      createdAt: new Date('2026-06-30T00:00:00.000Z'),
      updatedAt: new Date('2026-06-30T00:00:00.000Z'),
      deletedAt: null,
    });

  it('creates in-app and email notifications by default', async () => {
    const inApp = createNotification(
      'notification-in-app',
      NotificationChannel.IN_APP,
      NotificationDeliveryStatus.SENT,
    );
    const email = createNotification(
      'notification-email',
      NotificationChannel.EMAIL,
      NotificationDeliveryStatus.PENDING,
    );
    notificationRepository.create.mockResolvedValueOnce(inApp).mockResolvedValueOnce(email);

    const result = await handler.execute(new NotificationCreateCommand(basePayload));

    expect(queryBus.execute).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledTimes(2);
    expect(notificationRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: basePayload.userId,
        channel: NotificationChannel.IN_APP,
        status: NotificationDeliveryStatus.SENT,
        sentAt: expect.any(Date),
        isRead: false,
      }),
    );
    expect(notificationRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: basePayload.userId,
        channel: NotificationChannel.EMAIL,
        status: NotificationDeliveryStatus.PENDING,
        sentAt: null,
        isRead: false,
      }),
    );
    expect(dispatchService.enqueue).toHaveBeenCalledTimes(1);
    expect(dispatchService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        notificationId: email.id,
        userId: email.userId,
        channel: NotificationChannel.EMAIL,
      }),
    );
    expect(result.id).toBe(inApp.id);
  });

  it('deduplicates explicitly requested channels before creating rows', async () => {
    const email = createNotification(
      'notification-email',
      NotificationChannel.EMAIL,
      NotificationDeliveryStatus.PENDING,
    );
    notificationRepository.create.mockResolvedValueOnce(email);

    await handler.execute(
      new NotificationCreateCommand({
        ...basePayload,
        channels: [NotificationChannel.EMAIL, NotificationChannel.EMAIL],
      }),
    );

    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(notificationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: NotificationChannel.EMAIL,
        status: NotificationDeliveryStatus.PENDING,
      }),
    );
    expect(dispatchService.enqueue).toHaveBeenCalledTimes(1);
  });
});
