import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyReply, FastifyRequest } from 'fastify';

import { LoginFailureReason, LoginResponse } from '@libs/contracts/auth';
import { User, type IUserRole } from '../../domain/entities';
import { UserRepository } from '../../domain/repositories';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';
import { UserLoginCommand } from '../commands';
import { LoginUserHandler } from './user-login.handler';

describe('LoginUserHandler', () => {
  let handler: LoginUserHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let authGateway: jest.Mocked<AuthGatewayPort>;

  const request = { ip: '127.0.0.1', headers: {} } as FastifyRequest;
  const reply = { setCookie: jest.fn(), clearCookie: jest.fn() } as unknown as FastifyReply;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserHandler,
        {
          provide: UserRepository,
          useValue: { findById: jest.fn() },
        },
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
        {
          provide: AuthGatewayPort,
          useValue: { login: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, defaultValue: unknown) => defaultValue) },
        },
      ],
    }).compile();

    handler = module.get(LoginUserHandler);
    userRepository = module.get(UserRepository);
    authGateway = module.get(AuthGatewayPort);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function login(): Promise<unknown> {
    return handler.execute(new UserLoginCommand({ email: 'admin@example.com', password: 'WrongPassword123!' }, request, reply));
  }

  function mockLoginResult(overrides: Partial<LoginResponse>): void {
    authGateway.login.mockResolvedValue({
      success: false,
      accessToken: '',
      refreshToken: '',
      csrfToken: '',
      userId: '',
      email: '',
      failureReason: '',
      lockedUntil: '',
      requiresCaptcha: false,
      ...overrides,
    });
  }

  it('rejects when the account is temporarily locked', async () => {
    mockLoginResult({
      failureReason: LoginFailureReason.ACCOUNT_LOCKED,
      lockedUntil: '2026-07-01T10:30:00.000Z',
    });

    await expect(login()).rejects.toThrow(ForbiddenException);
    await expect(login()).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'user.auth.accountLocked',
        lockedUntil: '2026-07-01T10:30:00.000Z',
      }),
    });
  });

  it('surfaces requiresCaptcha on invalid credentials', async () => {
    mockLoginResult({ failureReason: LoginFailureReason.INVALID_CREDENTIALS, requiresCaptcha: true });

    await expect(login()).rejects.toThrow(UnauthorizedException);
    await expect(login()).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'user.auth.invalidCredentials',
        requiresCaptcha: true,
      }),
    });
  });

  it('rejects unverified accounts', async () => {
    mockLoginResult({ failureReason: LoginFailureReason.NOT_VERIFIED });
    await expect(login()).rejects.toMatchObject({ message: 'user.auth.verified' });
  });

  it('rejects blocked accounts', async () => {
    mockLoginResult({ failureReason: LoginFailureReason.BLOCKED });
    await expect(login()).rejects.toMatchObject({ message: 'user.auth.blocked' });
  });

  it('rejects when the account does not exist without leaking that detail', async () => {
    mockLoginResult({ failureReason: LoginFailureReason.USER_NOT_FOUND });
    await expect(login()).rejects.toMatchObject({ message: 'user.auth.invalidCredentials' });
  });

  it('returns the mapped user and tokens on success, and sets auth cookies', async () => {
    authGateway.login.mockResolvedValue({
      success: true,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
      userId: 'user-1',
      email: 'admin@example.com',
      failureReason: '',
      lockedUntil: '',
      requiresCaptcha: false,
    });
    userRepository.findById.mockResolvedValue(makeUser());

    await expect(login()).resolves.toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: expect.objectContaining({ id: 'user-1' }),
    });

    expect(reply.setCookie).toHaveBeenCalled();
  });
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
