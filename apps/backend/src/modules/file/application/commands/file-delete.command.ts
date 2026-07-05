import { Command } from '@nestjs/cqrs';

import type { IdType } from '@/interfaces/id.type';
import type { RoleType } from '@/enums/role-type.enum';

export class FileDeleteCommand extends Command<boolean> {
  constructor(
    public readonly params: {
      fileId: IdType;
      currentUserId: IdType;
      currentRoleType?: RoleType;
    },
  ) {
    super();
  }
}
