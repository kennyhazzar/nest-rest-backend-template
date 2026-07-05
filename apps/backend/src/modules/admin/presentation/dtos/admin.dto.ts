import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { IdType } from '@/interfaces/id.type';

export class DashboardDto {
  @ApiProperty({ description: 'Total number of registered users' })
  totalUsers!: number;

  @ApiProperty({ description: 'Number of non-blocked users' })
  activeUsers!: number;

  @ApiProperty({ description: 'Total number of configured roles' })
  totalRoles!: number;

  @ApiProperty({ description: 'Unread in-app notifications' })
  unreadNotifications!: number;

  @ApiProperty({ description: 'Pending emails waiting for dispatch' })
  queuedMails!: number;
}

export class AccessLogDto {
  @ApiProperty({ description: 'Unique access log entry identifier', format: 'uuid' })
  id!: IdType;

  @ApiPropertyOptional({
    description: 'UUID of the authenticated user who performed the action',
    format: 'uuid',
    nullable: true,
  })
  userId!: IdType | null;

  @ApiPropertyOptional({
    description: 'Email of the user at the time of the action',
    example: 'admin@example.com',
    nullable: true,
  })
  email!: string | null;

  @ApiProperty({ description: 'Action that was performed', example: 'user.login' })
  action!: string;

  @ApiPropertyOptional({ description: 'IP address of the client', example: '192.168.1.10', nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ description: 'User-Agent header from the client request', nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ description: 'Additional JSON-encoded details about the action', nullable: true })
  details!: string | null;

  @ApiProperty({ description: 'When the access event was recorded' })
  createdAt!: Date;
}

export class AccessLogsQuery {
  @ApiPropertyOptional({ description: 'Filter by action name (partial match)', example: 'user.login' })
  @IsOptional()
  @IsString()
  action?: string;

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

export class SystemSettingDto {
  @ApiProperty({ description: 'Setting key (unique identifier)', example: 'feature.registration.enabled' })
  key!: string;

  @ApiProperty({ description: 'Setting value; JSON-encoded for complex types', example: 'true' })
  value!: string;

  @ApiProperty({ description: 'When the setting was last updated' })
  updatedAt!: Date;
}

export class UpdateSystemSettingBody {
  @ApiProperty({ description: 'Setting key to create or update', example: 'feature.registration.enabled' })
  @IsString()
  key!: string;

  @ApiProperty({ description: 'New setting value (JSON-encode complex types)', example: 'false' })
  @IsString()
  value!: string;
}
