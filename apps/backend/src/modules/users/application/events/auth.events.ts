import { IdType } from '@/interfaces/id.type';

export class UserLoginSucceededEvent {
  constructor(
    public readonly userId: IdType,
    public readonly email: string,
  ) {}
}

export class UserLoginFailedEvent {
  constructor(public readonly email: string) {}
}

export class UserLoggedOutEvent {
  constructor(public readonly success: boolean) {}
}

export class PasswordResetRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly userId?: IdType,
  ) {}
}

export class PasswordResetCompletedEvent {
  constructor(public readonly userId: IdType) {}
}

export class PasswordChangedEvent {
  constructor(public readonly userId: IdType) {}
}

export class AdminPasswordResetRequestedEvent {
  constructor(public readonly userId: IdType) {}
}
