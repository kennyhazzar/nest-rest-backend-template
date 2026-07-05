import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { FileDeleteCommand } from '../commands';
import { FileRepository } from '../../domain/repositories/file.repository';
import { RoleType } from '@/enums/role-type.enum';

@CommandHandler(FileDeleteCommand)
export class FileDeleteHandler implements ICommandHandler<FileDeleteCommand, boolean> {
  constructor(private readonly repo: FileRepository) {}

  async execute({ params: { fileId, currentUserId, currentRoleType } }: FileDeleteCommand): Promise<boolean> {
    const file = await this.repo.findById(fileId);

    if (!file) {
      throw new NotFoundException('file.notFound');
    }

    if (file.userId !== currentUserId && currentRoleType !== RoleType.MANAGER && currentRoleType !== RoleType.ADMIN) {
      throw new ForbiddenException('file.accessDenied');
    }

    const result = await this.repo.delete(fileId);
    return result.affected !== undefined && result.affected > 0;
  }
}
