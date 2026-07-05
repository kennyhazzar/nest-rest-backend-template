import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { buildPaginated } from '@/common/Paginated';
import { FilesUploadCommand } from '../commands/files-upload.command';
import { FileRepository } from '../../domain/repositories/file.repository';
import { FilesDto } from '../../presentation/dtos/file.dto';
import { FileMapper } from '../../presentation/mappers/file.mapper';

@CommandHandler(FilesUploadCommand)
export class FilesUploadHandler implements ICommandHandler<FilesUploadCommand, FilesDto> {
  constructor(private readonly repo: FileRepository) {}

  async execute({ params: { currentUserId, payload } }: FilesUploadCommand): Promise<FilesDto> {
    const files = await this.repo.uploads(currentUserId, payload);
    const items = files.nodes.map(FileMapper.toDto);
    return buildPaginated(items, files.totalCount, 1, items.length || 1);
  }
}
