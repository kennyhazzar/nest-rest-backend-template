import { Command } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { FileDto, UpdateFileBody } from '../../presentation/dtos/file.dto';

export class FileUpdateCommand extends Command<FileDto> {
  constructor(
    public readonly params: {
      payload: UpdateFileBody;
      currentUserId: IdType;
      currentRoleType?: RoleType;
      currentRoleId?: IdType;
    },
  ) {
    super();
  }
}
