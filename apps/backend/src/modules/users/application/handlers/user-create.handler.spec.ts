import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventBus, QueryBus } from '@nestjs/cqrs';
import { UserCreateHandler } from './user-create.handler';
import { UserCreateCommand } from '../commands';
import { UserRepository } from '../../domain/repositories';
import { PasswordService } from '../../domain/services/password.service';
import { User } from '../../domain/entities';
import { UserMapper } from '../../presentation/mappers';

describe('UserCreateHandler', () => {
  let handler: UserCreateHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;

  beforeEach(async () => {
    const mockUserRepository = {
      existsByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
    };

    const mockEventBus = { publish: jest.fn() };
    const mockQueryBus = { execute: jest.fn().mockResolvedValue({ id: 'role-uuid-123' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCreateHandler,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    handler = module.get<UserCreateHandler>(UserCreateHandler);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockInput = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'John',
      surname: 'Doe',
      middleName: undefined,
      phone: '+1234567890',
      gender: undefined,
      birthday: undefined,
      roleId: 'role-uuid-123',
    };

    it('should successfully create a user', async () => {
      // Arrange
      const hashedPassword = 'hashed_password_123';
      const createdUser = User.create({
        id: 'user-uuid-123',
        ...mockInput,
        password: hashedPassword,
        verified: true,
      });

      userRepository.existsByEmail.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(createdUser);

      const command = new UserCreateCommand(mockInput);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(userRepository.existsByEmail).toHaveBeenCalledWith(mockInput.email);
      expect(passwordService.hashPassword).toHaveBeenCalledWith(mockInput.password);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockInput.email,
          password: hashedPassword,
          name: mockInput.name,
          surname: mockInput.surname,
          roleId: mockInput.roleId,
          verified: true,
        }),
      );
      expect(result).toEqual(UserMapper.toDto(createdUser));
    });

    it('should throw BadRequestException if email already exists', async () => {
      // Arrange
      userRepository.existsByEmail.mockResolvedValue(true);
      const command = new UserCreateCommand(mockInput);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('user.email.alreadyExists');

      expect(userRepository.existsByEmail).toHaveBeenCalledWith(mockInput.email);
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should hash password before creating user', async () => {
      // Arrange
      const hashedPassword = 'hashed_password_456';
      const createdUser = User.create({
        id: 'user-uuid-456',
        ...mockInput,
        password: hashedPassword,
      });

      userRepository.existsByEmail.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(createdUser);

      const command = new UserCreateCommand(mockInput);

      // Act
      await handler.execute(command);

      // Assert
      expect(passwordService.hashPassword).toHaveBeenCalledTimes(1);
      expect(passwordService.hashPassword).toHaveBeenCalledWith(mockInput.password);

      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.password).toBe(hashedPassword);
      expect(createCall.password).not.toBe(mockInput.password);
    });

    it('should set verified to true for new users', async () => {
      // Arrange
      const hashedPassword = 'hashed_password_789';
      const createdUser = User.create({
        id: 'user-uuid-789',
        ...mockInput,
        password: hashedPassword,
        verified: true,
      });

      userRepository.existsByEmail.mockResolvedValue(false);
      passwordService.hashPassword.mockResolvedValue(hashedPassword);
      userRepository.create.mockResolvedValue(createdUser);

      const command = new UserCreateCommand(mockInput);

      // Act
      await handler.execute(command);

      // Assert
      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.verified).toBe(true);
    });
  });
});
