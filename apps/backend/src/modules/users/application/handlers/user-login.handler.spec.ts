import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { MailRepository } from '@/modules/mail/domain/repositories/mail.repository';
import { MailService } from '@/modules/mail/infrastructure/services/mail.service';
import { AuthServiceAdapter } from '../../infrastructure/adapters';
import { PasswordService } from '../../domain/services/password.service';
import { User, type IUserRole } from '../../domain/entities';
import { UserRepository } from '../../domain/repositories';
import { UserLoginCommand } from '../commands';
import { LoginUserHandler } from './user-login.handler';

describe('LoginUserHandler', () => {
  let handler: LoginUserHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let mailRepository: jest.Mocked<MailRepository>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserHandler,
        {
          provide: UserRepository,
          useValue: {
            findByEmail: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: AuthServiceAdapter,
          useValue: {},
        },
        {
          provide: PasswordService,
          useValue: {
            verifyPassword: jest.fn(),
            needsRehash: jest.fn().mockReturnValue(false),
            hashPassword: jest.fn(),
          },
        },
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
        {
          provide: MailRepository,
          useValue: {
            create: jest.fn().mockResolvedValue({ id: 'mail-1' }),
          },
        },
        {
          provide: MailService,
          useValue: {
            addToQueue: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    handler = module.get(LoginUserHandler);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
    mailRepository = module.get(MailRepository);
    mailService = module.get(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('rejects a temporarily locked account before password verification', async () => {
    const lockedUntil = new Date(Date.now() + 60_000);
    userRepository.findByEmail.mockResolvedValue(makeUser({ lockedUntil, failedLoginAttempts: 5 }));

    await expect(login()).rejects.toThrow(ForbiddenException);
    await expect(login()).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'user.auth.accountLocked',
        lockedUntil: lockedUntil.toISOString(),
      }),
    });

    expect(passwordService.verifyPassword).not.toHaveBeenCalled();
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('increments failed login attempts and asks frontend to enable captcha from the third failure', async () => {
    const failedLoginWindowStartedAt = new Date(Date.now() - 60_000);
    userRepository.findByEmail.mockResolvedValue(makeUser({ failedLoginAttempts: 2, failedLoginWindowStartedAt }));
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(login()).rejects.toThrow(UnauthorizedException);
    await expect(login()).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'user.auth.invalidCredentials',
        requiresCaptcha: true,
      }),
    });

    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 3,
      failedLoginWindowStartedAt,
      lockedUntil: null,
    });
    expect(mailRepository.create).not.toHaveBeenCalled();
    expect(mailService.addToQueue).not.toHaveBeenCalled();
  });

  it('locks account for 30 minutes and queues an email on the fifth failure', async () => {
    const now = new Date('2026-07-01T10:00:00.000Z');
    const failedLoginWindowStartedAt = new Date('2026-07-01T09:50:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    userRepository.findByEmail.mockResolvedValue(makeUser({ failedLoginAttempts: 4, failedLoginWindowStartedAt }));
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(login()).rejects.toThrow(UnauthorizedException);

    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 5,
      failedLoginWindowStartedAt,
      lockedUntil: new Date('2026-07-01T10:30:00.000Z'),
    });
    expect(mailRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.com',
        subject: 'Security alert: account temporarily locked',
      }),
    );
    expect(mailService.addToQueue).toHaveBeenCalledWith(expect.objectContaining({ id: 'mail-1' }));
  });

  it('starts a new failure window when the previous one is older than 15 minutes', async () => {
    const now = new Date('2026-07-01T10:20:00.000Z');
    jest.useFakeTimers().setSystemTime(now);
    userRepository.findByEmail.mockResolvedValue(
      makeUser({ failedLoginAttempts: 4, failedLoginWindowStartedAt: new Date('2026-07-01T10:00:00.000Z') }),
    );
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(login()).rejects.toThrow(UnauthorizedException);

    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 1,
      failedLoginWindowStartedAt: now,
      lockedUntil: null,
    });
    expect(mailRepository.create).not.toHaveBeenCalled();
  });

  it('resets failed attempts, failure window and lock flag after a successful login', async () => {
    userRepository.findByEmail.mockResolvedValue(
      makeUser({
        failedLoginAttempts: 2,
        failedLoginWindowStartedAt: new Date(Date.now() - 60_000),
        lockedUntil: null,
      }),
    );
    passwordService.verifyPassword.mockResolvedValue(true);

    await expect(login()).resolves.toMatchObject({ id: 'user-1' });

    expect(userRepository.update).toHaveBeenCalledWith('user-1', {
      failedLoginAttempts: 0,
      failedLoginWindowStartedAt: null,
      lockedUntil: null,
    });
  });

  function login(): Promise<User> {
    return handler.execute(new UserLoginCommand({ email: 'admin@example.com', password: 'WrongPassword123!' }));
  }
});

function makeUser(overrides: Partial<User> = {}): User {
  const user = User.create({
    id: 'user-1',
    email: 'admin@example.com',
    password: 'hashed-password',
    name: 'Admin',
    surname: 'User',
    roleId: 'role-1',
    verified: true,
  });
  user.role = {
    id: 'role-1',
    name: 'Admin',
    type: 'admin',
  } as IUserRole;

  return Object.assign(user, overrides);
}
