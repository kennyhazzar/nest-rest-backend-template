import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthTokenVersionService } from '../../infrastructure/services';
import { User } from '../../domain/entities';
import { UserRepository } from '../../domain/repositories';
import { UserUpdateCommand } from '../commands';
import { UserUpdateHandler } from './user-update.handler';

describe('UserUpdateHandler', () => {
  let handler: UserUpdateHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let tokenVersionService: jest.Mocked<AuthTokenVersionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserUpdateHandler,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn().mockResolvedValue({ affected: 1 }),
          },
        },
        {
          provide: AuthTokenVersionService,
          useValue: {
            bumpVersion: jest.fn().mockResolvedValue(2),
          },
        },
      ],
    }).compile();

    handler = module.get(UserUpdateHandler);
    userRepository = module.get(UserRepository);
    tokenVersionService = module.get(AuthTokenVersionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('bumps token version when role changes', async () => {
    const previous = makeUser({ roleId: 'role-admin', tokenVersion: 1 });
    const updated = makeUser({ roleId: 'role-user', tokenVersion: 2 });
    userRepository.findById.mockResolvedValueOnce(previous).mockResolvedValueOnce(updated);

    await handler.execute(new UserUpdateCommand('user-1', { roleId: 'role-user' }));

    expect(userRepository.update).toHaveBeenCalledWith('user-1', { roleId: 'role-user' });
    expect(tokenVersionService.bumpVersion).toHaveBeenCalledWith('user-1');
  });

  it('bumps token version when blocked flag changes', async () => {
    const previous = makeUser({ blocked: false, tokenVersion: 1 });
    const updated = makeUser({ blocked: true, tokenVersion: 2 });
    userRepository.findById.mockResolvedValueOnce(previous).mockResolvedValueOnce(updated);

    await handler.execute(new UserUpdateCommand('user-1', { blocked: true }));

    expect(tokenVersionService.bumpVersion).toHaveBeenCalledWith('user-1');
  });

  it('does not bump token version for profile-only updates', async () => {
    const previous = makeUser({ roleId: 'role-user', name: 'Old' });
    const updated = makeUser({ roleId: 'role-user', name: 'New' });
    userRepository.findById.mockResolvedValueOnce(previous).mockResolvedValueOnce(updated);

    await handler.execute(new UserUpdateCommand('user-1', { name: 'New' }));

    expect(tokenVersionService.bumpVersion).not.toHaveBeenCalled();
  });

  it('throws not found before update when user does not exist', async () => {
    userRepository.findById.mockResolvedValueOnce(null);

    await expect(handler.execute(new UserUpdateCommand('missing-user', { name: 'New' }))).rejects.toThrow(
      NotFoundException,
    );

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(tokenVersionService.bumpVersion).not.toHaveBeenCalled();
  });
});

function makeUser(overrides: Partial<User> = {}): User {
  const user = User.create({
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test',
    surname: 'User',
    roleId: 'role-user',
    verified: true,
    tokenVersion: 1,
  });
  user.role = {
    id: user.roleId,
    name: 'User',
    type: 'user',
  };

  return Object.assign(user, overrides);
}
