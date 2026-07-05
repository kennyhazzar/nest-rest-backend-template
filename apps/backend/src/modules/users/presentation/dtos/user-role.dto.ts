import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { Paginated } from '@/common/Paginated';

export class UserRoleDto {
  @ApiProperty({
    description: 'Unique role identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id!: IdType;

  @ApiProperty({ description: 'Display name of the role', example: 'Content Manager' })
  name!: string;

  @ApiPropertyOptional({ description: 'Human-readable description of the role', example: 'Operational content access' })
  description?: string;

  @ApiProperty({ description: 'System role type that controls base permission set', enum: RoleType })
  type!: RoleType;

  @ApiPropertyOptional({ description: 'When the role was created' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'When the role was last updated' })
  updatedAt?: Date;
}

export class UserRolesDto extends Paginated(UserRoleDto) {}
