import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';

import { UsersModule } from '@/modules/users/users.module';

// Infrastructure
import { NotificationRepositoryDrizzle } from './infrastructure/repositories/notification.repository.drizzle';
import { NotificationDispatchService } from './infrastructure/services/notification-dispatch.service';
import { NotificationPendingDispatcherService } from './infrastructure/services/notification-pending-dispatcher.service';
import { NotificationDispatchProcessor } from './infrastructure/processors/notification-dispatch.processor';

// Domain
import { NotificationRepository } from './domain/repositories/notification.repository';

// Application
import { NotificationCreateHandler } from './application/handlers/notification-create.handler';
import { NotificationMarkReadHandler } from './application/handlers/notification-mark-read.handler';
import { NotificationMarkAllReadHandler } from './application/handlers/notification-mark-all-read.handler';
import { NotificationDeleteHandler } from './application/handlers/notification-delete.handler';
import { NotificationsGetHandler } from './application/handlers/notifications-get.handler';
import { NotificationUnreadCountHandler } from './application/handlers/notification-unread-count.handler';
import { UserCreatedEventHandler } from './application/handlers/events';
import { NotificationController } from './presentation/controllers/notification.controller';

const CommandHandlers = [
  NotificationCreateHandler,
  NotificationMarkReadHandler,
  NotificationMarkAllReadHandler,
  NotificationDeleteHandler,
];

const QueryHandlers = [NotificationsGetHandler, NotificationUnreadCountHandler];

const EventHandlers = [UserCreatedEventHandler];

@Module({
  imports: [CqrsModule, UsersModule, BullModule.registerQueue({ name: 'notifications' })],
  controllers: [NotificationController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    {
      provide: NotificationRepository,
      useClass: NotificationRepositoryDrizzle,
    },
    NotificationDispatchService,
    NotificationPendingDispatcherService,
    NotificationDispatchProcessor,
  ],
  exports: [NotificationRepository, NotificationDispatchService],
})
export class NotificationModule {}
