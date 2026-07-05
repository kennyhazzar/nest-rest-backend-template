import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IdType } from '@/interfaces/id.type';
import { Gender } from '@/enums/gender.enum';
import { Theme } from '@/enums/theme.enum';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{12,32}$/;

export class LoginBody {
  @ApiProperty({ description: 'User email address', example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Account password', example: 'Str0ng!Pass' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class CreateUserBody {
  @ApiProperty({ description: 'User email address', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'Password — 12–32 chars, must include uppercase, lowercase, digit and special character (@$!%*?&._-)',
    example: 'Str0ng!Pass',
    minLength: 12,
    maxLength: 32,
  })
  @IsString()
  @MinLength(12)
  @MaxLength(32)
  @Matches(PASSWORD_REGEX, { message: 'validation.PASSWORD_TOO_WEAK' })
  password!: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  surname!: string;

  @ApiPropertyOptional({ description: 'Middle name (patronymic)', example: 'Michael' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format', example: '+79001234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Biological sex', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Date of birth (ISO 8601)', example: '1990-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthday?: Date;

  @ApiProperty({ description: 'UUID of the role to assign', format: 'uuid' })
  @IsUUID('4')
  @IsNotEmpty()
  roleId!: IdType;
}

export class UpdateUserBody {
  @ApiPropertyOptional({ description: 'New email address', example: 'newemail@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsOptional()
  surname?: string;

  @ApiPropertyOptional({ description: 'Middle name (patronymic)', example: 'Michael' })
  @IsString()
  @IsOptional()
  middleName?: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format', example: '+79001234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Biological sex', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Date of birth (ISO 8601)', example: '1990-01-15T00:00:00.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthday?: Date;

  @ApiPropertyOptional({ description: 'New role UUID', format: 'uuid' })
  @IsUUID('4')
  @IsOptional()
  roleId?: IdType;

  @ApiPropertyOptional({ description: 'Block (true) or unblock (false) the user account' })
  @IsBoolean()
  @IsOptional()
  blocked?: boolean;
}

export class UpdateThemeBody {
  @ApiProperty({ description: 'UI colour theme preference', enum: Theme })
  @IsEnum(Theme)
  theme!: Theme;
}

export class RefreshTokenBody {
  @ApiPropertyOptional({
    description: 'Refresh token string. Can be omitted when the token is sent as an httpOnly cookie.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class UsersQuery {
  @ApiPropertyOptional({ description: 'Page number (1-based)', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number;
}
