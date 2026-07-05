import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { FileRepository } from '../../domain/repositories/file.repository';
import { FileDownloadCommand } from '../commands/file-download.command';

@CommandHandler(FileDownloadCommand)
export class FileDownloadHandler implements ICommandHandler<FileDownloadCommand, void> {
  constructor(private readonly repo: FileRepository) {}

  async execute({
    params: { reply, fileId, versionId, currentUserId, currentRoleType },
  }: FileDownloadCommand): Promise<void> {
    await this.repo.download({
      reply,
      fileId,
      versionId,
      currentUserId,
      currentRoleType,
    });
  }
}
