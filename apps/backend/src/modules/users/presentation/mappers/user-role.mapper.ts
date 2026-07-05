import { UserRole } from '../../domain/entities';
import { UserRoleDto } from '../dtos';

export class UserRoleMapper {
  static toDto(role: UserRole): UserRoleDto {
    const dto = new UserRoleDto();
    dto.id = role.id;
    dto.name = role.name;
    dto.description = role.description;
    dto.type = role.type;
    dto.createdAt = role.createdAt;
    dto.updatedAt = role.updatedAt;
    return dto;
  }
}
