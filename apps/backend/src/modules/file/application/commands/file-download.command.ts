import { Command } from '@nestjs/cqrs';
import { FastifyReply } from 'fastify';

import type { IdType } from '@/interfaces/id.type';
import type { RoleType } from '@/enums/role-type.enum';

export class FileDownloadCommand extends Command<void> {
  constructor(
    public readonly params: {
      reply: FastifyReply;
      fileId: IdType;
      versionId?: IdType;
      currentUserId?: IdType;
      currentRoleType?: RoleType;
    },
  ) {
    super();
  }
}
