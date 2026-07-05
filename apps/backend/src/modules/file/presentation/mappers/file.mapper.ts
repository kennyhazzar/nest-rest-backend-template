import { FileDto } from '../dtos/file.dto';
import { FileVersionDto } from '../dtos/file-version.dto';
import { FileVersionMapper } from './file-version.mapper';
import { File } from '../../domain/entities';

export class FileMapper {
  static toDto = (entity: File): FileDto => ({
    id: entity.id,
    name: entity.name,
    description: entity.description,
    lastVersion: entity.lastVersion ? FileVersionMapper.toDto(entity.lastVersion) : undefined,
    lastVersionId: entity.lastVersionId,
    versions: entity.versions
      ? entity.versions.map((version) => FileVersionMapper.toDto(version))
      : ([] as FileVersionDto[]),
    userId: entity.userId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
