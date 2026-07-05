import { NotificationType } from '@/enums/notification-type.enum';
import { Notification } from '../../domain/entities';
import { NotificationChannel, NotificationDeliveryStatus } from '../../domain/enums';
import { NotificationRepository } from '../../domain/repositories/notification.repository';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationPendingDispatcherService } from './notification-pending-dispatcher.service';

describe('NotificationPendingDispatcherService', () => {
  let service: NotificationPendingDispatcherService;
  let notificationRepository: jest.Mocked<NotificationRepository>;
  let dispatchService: jest.Mocked<NotificationDispatchService>;

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

    service = new NotificationPendingDispatcherService(notificationRepository, dispatchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues due pending notifications in bounded batches', async () => {
    const notification = new Notification({
      id: 'notification-email',
      userId: 'user-1',
      title: 'Disk space low',
      content: 'Disk usage on server-1 exceeded 90%',
      type: NotificationType.WARNING,
      channel: NotificationChannel.EMAIL,
      status: NotificationDeliveryStatus.PENDING,
      attempts: 1,
      isRead: false,
      metadata: { entityId: 'entity-1' },
    });
    notificationRepository.findPendingForDispatch.mockResolvedValue([notification]);

    await service.dispatchPending();

    expect(notificationRepository.findPendingForDispatch).toHaveBeenCalledWith(100);
    expect(dispatchService.enqueue).toHaveBeenCalledWith({
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      channel: notification.channel,
      metadata: notification.metadata,
    });
  });

  it('does nothing when there are no due notifications', async () => {
    notificationRepository.findPendingForDispatch.mockResolvedValue([]);

    await service.dispatchPending();

    expect(dispatchService.enqueue).not.toHaveBeenCalled();
  });
});
