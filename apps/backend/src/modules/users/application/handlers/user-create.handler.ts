import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';

import { UserRepository } from '../../domain/repositories';
import { PasswordService } from '../../domain/services/password.service';
import { User } from '../../domain/entities';
import { UserCreateCommand } from '../commands';
import { UserRoleGetByIdQuery } from '../queries';
import { UserDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';
import { UserCreatedEvent } from '../events';

@CommandHandler(UserCreateCommand)
export class UserCreateHandler implements ICommandHandler<UserCreateCommand> {
  private readonly logger = new Logger(UserCreateHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly eventBus: EventBus,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: UserCreateCommand): Promise<UserDto> {
    const { email, password, name, surname, middleName, phone, gender, birthday, roleId } = command.payload;

    const exists = await this.userRepository.existsByEmail(email);
    if (exists) {
      this.logger.warn(`User creation rejected: email=${email} reason=email_already_exists`);
      throw new BadRequestException('user.email.alreadyExists');
    }

    if (roleId) {
      await this.queryBus.execute(new UserRoleGetByIdQuery(roleId));
    }

    // Hash password before creating user entity
    const hashedPassword = await this.passwordService.hashPassword(password);

    const user = User.create({
      email,
      password: hashedPassword,
      name,
      surname,
      middleName,
      phone,
      gender,
      birthday,
      roleId,
      verified: true,
    });

    const created = await this.userRepository.create(user);
    this.logger.log(`User created: userId=${created.id} email=${created.email} roleId=${created.roleId ?? 'none'}`);

    // Publish UserCreatedEvent for other modules to react (e.g., notifications)
    this.eventBus.publish(new UserCreatedEvent(created.id, created.email, created.name, created.surname));

    return UserMapper.toDto(created);
  }
}
