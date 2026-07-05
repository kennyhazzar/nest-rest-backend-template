import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { UserDto } from './user.dto';

export class AuthResponseDto {
  @ApiPropertyOptional({
    description: 'JWT access token. Present in HYBRID and RESPONSE_ONLY auth modes.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'JWT refresh token. Present in HYBRID and RESPONSE_ONLY auth modes.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'CSRF protection token. Present when CSRF is enabled and mode is not COOKIES_ONLY.',
    example: 'a1b2c3d4e5f6...',
  })
  csrfToken?: string;

  @ApiProperty({ description: 'Authenticated user profile', type: () => UserDto })
  user!: UserDto;
}

export class AccessTokenResponseDto {
  @ApiPropertyOptional({
    description: 'New JWT access token.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'New JWT refresh token (rotated).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Updated CSRF token.', example: 'a1b2c3d4e5f6...' })
  csrfToken?: string;
}

export class LogoutResponseDto {
  @ApiProperty({ description: 'Whether the logout was successful' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Localized human-readable status message', example: 'Выход выполнен успешно' })
  message?: string;

  @ApiPropertyOptional({ description: 'Stable i18n key for frontend logic', example: 'user.auth.logout.success' })
  messageKey?: string;
}

export class ForgotPasswordBody {
  @ApiProperty({ description: 'Email address of the account to recover', example: 'user@example.com' })
  @IsEmail()
  email!: string;
}

export class ResetPasswordBody {
  @ApiProperty({
    description: 'One-time reset token received via email',
    example: 'a1b2c3d4e5f6789...',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    description: 'New password — minimum 12 characters',
    example: 'NewStr0ng!Pass',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}

export class ChangePasswordBody {
  @ApiProperty({ description: 'Current account password (for verification)', example: 'OldStr0ng!Pass' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password — minimum 12 characters',
    example: 'NewStr0ng!Pass',
    minLength: 12,
  })
  @IsString()
  @MinLength(12)
  newPassword!: string;
}

export class SuccessResponseDto {
  @ApiProperty({ description: 'Whether the operation succeeded' })
  success!: boolean;
}
