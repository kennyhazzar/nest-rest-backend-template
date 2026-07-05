import { NotificationChannel } from '@/modules/notification/domain/enums';
import { User } from '../../domain/entities';
import { UserDto } from '../dtos';
import { UserRoleMapper } from './user-role.mapper';

export class UserMapper {
  static toDto(user: User): UserDto {
    const dto = new UserDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.surname = user.surname;
    dto.middleName = user.middleName;
    dto.phone = user.phone;
    dto.gender = user.gender;
    dto.birthday = user.birthday;
    dto.verified = user.verified;
    dto.blocked = user.blocked;
    dto.country = user.country;
    dto.language = user.language;
    dto.locale = user.locale;
    dto.theme = user.theme;
    dto.notificationChannels = user.notificationChannels?.filter(isNotificationChannel) ?? null;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;

    if (user.role) {
      dto.role = UserRoleMapper.toDto(user.role);
    }

    return dto;
  }
}

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return Object.values(NotificationChannel).includes(value as NotificationChannel);
}
