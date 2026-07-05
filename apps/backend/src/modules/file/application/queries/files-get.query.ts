import { Query } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';
import { FilesDto } from '../../presentation/dtos/file.dto';

export class FilesGetQuery extends Query<FilesDto> {
  constructor(
    public readonly params: {
      currentRoleId: IdType;
      currentUserId: IdType;
      currentRoleType?: RoleType;
      page?: number;
      per_page?: number;
    },
  ) {
    super();
  }
}
