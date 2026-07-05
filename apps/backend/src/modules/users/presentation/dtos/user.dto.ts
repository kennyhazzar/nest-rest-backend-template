import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';

import { IdType } from '@/interfaces/id.type';
import { Gender } from '@/enums/gender.enum';
import { Theme } from '@/enums/theme.enum';
import { Paginated } from '@/common/Paginated';
import { NotificationChannel } from '@/modules/notification/domain/enums';
import { UserRoleDto } from './user-role.dto';

export const NOTIFICATION_CHANNELS = Object.values(NotificationChannel);

export class NotificationPreferencesDto {
  @ApiProperty({
    description: 'List of notification delivery channels enabled for the user',
    type: [String],
    enum: NotificationChannel,
    example: ['email', 'push'],
  })
  channels!: NotificationChannel[];
}

export class UpdateNotificationPreferencesBody {
  @ApiProperty({
    description: 'Desired notification channels. Replaces the current setting entirely.',
    type: [String],
    enum: NotificationChannel,
    example: ['email'],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];
}

export class UserDto {
  @ApiProperty({
    description: 'Unique user identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: IdType;

  @ApiProperty({ description: 'Email address (used for login)', example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  name!: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  surname!: string;

  @ApiPropertyOptional({ description: 'Middle name / patronymic', example: 'Michael' })
  middleName?: string;

  @ApiPropertyOptional({ description: 'Phone number in E.164 format', example: '+79001234567' })
  phone?: string;

  @ApiProperty({ description: 'Biological sex', enum: Gender })
  gender!: Gender;

  @ApiPropertyOptional({ description: 'Date of birth', example: '1990-01-15T00:00:00.000Z' })
  birthday?: Date;

  @ApiProperty({ description: 'Whether the email address has been verified' })
  verified!: boolean;

  @ApiProperty({ description: 'Whether the account is blocked from logging in' })
  blocked!: boolean;

  @ApiProperty({ description: 'ISO 3166-1 alpha-2 country code derived from sign-up', example: 'RU' })
  country!: string;

  @ApiProperty({ description: 'IETF language tag', example: 'ru' })
  language!: string;

  @ApiProperty({ description: 'Locale string for date/number formatting', example: 'ru-RU' })
  locale!: string;

  @ApiProperty({ description: 'UI colour theme', enum: Theme })
  theme!: Theme;

  @ApiPropertyOptional({
    description: 'Enabled notification delivery channels',
    type: [String],
    enum: NotificationChannel,
    nullable: true,
  })
  notificationChannels?: NotificationChannel[] | null;

  @ApiPropertyOptional({ description: 'Assigned system role', type: () => UserRoleDto })
  role?: UserRoleDto;

  @ApiPropertyOptional({ description: 'When the user account was created' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'When the user account was last updated' })
  updatedAt?: Date;
}

export class UsersDto extends Paginated(UserDto) {}
