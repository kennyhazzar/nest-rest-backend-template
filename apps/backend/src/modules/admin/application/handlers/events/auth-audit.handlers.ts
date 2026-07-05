import { CommandBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';

import {
  AdminPasswordResetRequestedEvent,
  PasswordChangedEvent,
  PasswordResetCompletedEvent,
  PasswordResetRequestedEvent,
  UserLoggedOutEvent,
  UserLoginFailedEvent,
  UserLoginSucceededEvent,
} from '@/modules/users/application/events/auth.events';
import { WriteAccessLogCommand } from '../../commands/admin.commands';

@EventsHandler(UserLoginSucceededEvent)
export class UserLoginSucceededAuditHandler implements IEventHandler<UserLoginSucceededEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserLoginSucceededEvent): Promise<void> {
    await this.commandBus.execute(
      new WriteAccessLogCommand('login_success', {
        userId: event.userId,
        email: event.email,
      }),
    );
  }
}

@EventsHandler(UserLoginFailedEvent)
export class UserLoginFailedAuditHandler implements IEventHandler<UserLoginFailedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserLoginFailedEvent): Promise<void> {
    await this.commandBus.execute(
      new WriteAccessLogCommand('login_failed', {
        email: event.email,
      }),
    );
  }
}

@EventsHandler(UserLoggedOutEvent)
export class UserLoggedOutAuditHandler implements IEventHandler<UserLoggedOutEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: UserLoggedOutEvent): Promise<void> {
    await this.commandBus.execute(
      new WriteAccessLogCommand('logout', {
        details: { success: event.success },
      }),
    );
  }
}

@EventsHandler(PasswordResetRequestedEvent)
export class PasswordResetRequestedAuditHandler implements IEventHandler<PasswordResetRequestedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    await this.commandBus.execute(
      new WriteAccessLogCommand('password_reset_requested', {
        userId: event.userId,
        email: event.email,
      }),
    );
  }
}

@EventsHandler(PasswordResetCompletedEvent)
export class PasswordResetCompletedAuditHandler implements IEventHandler<PasswordResetCompletedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: PasswordResetCompletedEvent): Promise<void> {
    await this.commandBus.execute(new WriteAccessLogCommand('password_reset_completed', { userId: event.userId }));
  }
}

@EventsHandler(PasswordChangedEvent)
export class PasswordChangedAuditHandler implements IEventHandler<PasswordChangedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: PasswordChangedEvent): Promise<void> {
    await this.commandBus.execute(new WriteAccessLogCommand('password_changed', { userId: event.userId }));
  }
}

@EventsHandler(AdminPasswordResetRequestedEvent)
export class AdminPasswordResetRequestedAuditHandler implements IEventHandler<AdminPasswordResetRequestedEvent> {
  constructor(private readonly commandBus: CommandBus) {}

  async handle(event: AdminPasswordResetRequestedEvent): Promise<void> {
    await this.commandBus.execute(
      new WriteAccessLogCommand('admin_password_reset_requested', { userId: event.userId }),
    );
  }
}

export const AuthAuditEventHandlers = [
  UserLoginSucceededAuditHandler,
  UserLoginFailedAuditHandler,
  UserLoggedOutAuditHandler,
  PasswordResetRequestedAuditHandler,
  PasswordResetCompletedAuditHandler,
  PasswordChangedAuditHandler,
  AdminPasswordResetRequestedAuditHandler,
];
