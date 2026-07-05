import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { RoleType } from '@/enums/role-type.enum';

export class CreateUserRoleBody {
  @ApiProperty({
    description: 'Display name of the role',
    example: 'Content Manager',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Human-readable description of what this role can do',
    example: 'Can manage operational content and user-owned files',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'System role type that controls base permission set',
    enum: RoleType,
  })
  @IsEnum(RoleType)
  @IsNotEmpty()
  type!: RoleType;
}

export class UpdateUserRoleBody {
  @ApiPropertyOptional({
    description: 'New display name for the role',
    example: 'Lead Manager',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Read-only access to operational resources',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'System role type', enum: RoleType })
  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;
}
