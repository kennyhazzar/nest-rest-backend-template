import { Command } from '@nestjs/cqrs';

import type { IdType } from '@/interfaces/id.type';
import type { RoleType } from '@/enums/role-type.enum';
import { FilesDto, UploadFileBody } from '../../presentation/dtos/file.dto';

export class FilesUploadCommand extends Command<FilesDto> {
  constructor(
    public readonly params: {
      payload: UploadFileBody[];
      currentUserId: IdType;
      currentRoleId?: IdType;
      currentRoleType?: RoleType;
    },
  ) {
    super();
  }
}
