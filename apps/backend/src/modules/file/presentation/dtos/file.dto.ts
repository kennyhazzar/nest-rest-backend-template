import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import type { IdType } from '@/interfaces/id.type';
import { FileFrom } from '@/enums/file-from.enum';
import { FileType } from '@/enums/file-type.enum';
import { Paginated } from '@/common/Paginated';
import { UserDto } from '../../../users/presentation/dtos/user.dto';
import { FileVersionDto } from './file-version.dto';

export class FileDto {
  @ApiProperty({ description: 'Unique file identifier', format: 'uuid' })
  id!: IdType;

  @ApiProperty({ description: 'Display name of the file', example: 'avatar.jpg' })
  name!: string;

  @ApiPropertyOptional({ description: 'Optional description or notes about the file' })
  description?: string;

  @ApiPropertyOptional({ description: 'Most recent version of the file', type: () => FileVersionDto })
  lastVersion?: FileVersionDto;

  @ApiPropertyOptional({ description: 'UUID of the most recent file version', format: 'uuid' })
  lastVersionId?: IdType;

  @ApiPropertyOptional({ description: 'All versions of the file', type: [FileVersionDto] })
  versions?: FileVersionDto[];

  @ApiPropertyOptional({ description: 'User who uploaded the file', type: () => UserDto })
  user?: UserDto;

  @ApiProperty({ description: 'UUID of the user who owns / uploaded the file', format: 'uuid' })
  userId!: IdType;

  @ApiPropertyOptional({ description: 'When the file record was created' })
  createdAt?: Date;

  @ApiPropertyOptional({ description: 'When the file record was last updated' })
  updatedAt?: Date;
}

export class FilesDto extends Paginated(FileDto) {}

export interface IFileExtra {
  name?: string;
  description?: string;
  module?: FileFrom;
  externalId?: string;
}

export class UploadFileBody implements IFileExtra {
  @ApiProperty({ description: 'Display name for the uploaded file', example: 'avatar.jpg' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional description or notes about the file' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Module/context this file is attached to', enum: FileFrom })
  @IsEnum(FileFrom)
  module!: FileFrom;

  @ApiProperty({ description: 'UUID of the entity this file is attached to', format: 'uuid' })
  @IsUUID('all')
  externalId!: IdType;

  @ApiProperty({ description: 'Semantic type of the file', enum: FileType })
  @IsEnum(FileType)
  type!: FileType;

  file?: any;
}

export class UpdateFileBody implements IFileExtra {
  @ApiProperty({ description: 'UUID of the file to update', format: 'uuid' })
  id!: IdType;

  @ApiPropertyOptional({ description: 'New display name for the file', example: 'updated-snapshot.jpg' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated description or notes' })
  @IsString()
  @IsOptional()
  description?: string;

  file?: any;
}
