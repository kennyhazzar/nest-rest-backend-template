import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UsersModule } from '@/modules/users/users.module';
import { AuthAuditEventHandlers } from './application/handlers/events/auth-audit.handlers';
import { AdminCommandHandlers, AdminQueryHandlers } from './application/handlers/admin.handlers';
import { AdminController } from './presentation/controllers/admin.controller';

@Module({
  imports: [CqrsModule, UsersModule],
  controllers: [AdminController],
  providers: [...AdminCommandHandlers, ...AdminQueryHandlers, ...AuthAuditEventHandlers],
})
export class AdminModule {}
