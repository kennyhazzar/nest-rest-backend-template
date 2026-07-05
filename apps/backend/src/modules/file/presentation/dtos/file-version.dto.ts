import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

import type { IdType } from '@/interfaces/id.type';
import { Paginated } from '@/common/Paginated';
import { UserDto } from '@/modules/users/presentation/dtos/user.dto';

export class FileVersionDto {
  @ApiProperty()
  id!: IdType;

  @ApiProperty()
  mimetype!: string;

  @ApiProperty()
  size!: number;

  @ApiPropertyOptional()
  versionId?: string | null;

  @ApiPropertyOptional({ type: () => UserDto })
  user?: UserDto;

  @ApiPropertyOptional()
  userId!: IdType;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  updatedAt?: Date;
}

export class FileVersionsDto extends Paginated(FileVersionDto) {}

export class FileVersionsQuery {
  @ApiProperty()
  @IsUUID('all')
  fileId!: IdType;
}
