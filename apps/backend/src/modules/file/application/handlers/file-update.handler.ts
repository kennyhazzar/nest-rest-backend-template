import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { FileUpdateCommand } from '../commands';
import { FileRepository } from '../../domain/repositories/file.repository';
import { FileDto, FileMapper } from '../../presentation';
import { RoleType } from '@/enums/role-type.enum';

@CommandHandler(FileUpdateCommand)
export class FileUpdateHandler implements ICommandHandler<FileUpdateCommand, FileDto> {
  constructor(private readonly repo: FileRepository) {}

  async execute({ params: { payload, currentUserId, currentRoleType } }: FileUpdateCommand): Promise<FileDto> {
    const file = await this.repo.findById(payload.id);

    if (!file) {
      throw new NotFoundException('file.notFound');
    }

    if (file.userId !== currentUserId && currentRoleType !== RoleType.MANAGER && currentRoleType !== RoleType.ADMIN) {
      throw new ForbiddenException('file.accessDenied');
    }

    return this.repo.update(payload.id, payload).then(FileMapper.toDto);
  }
}
