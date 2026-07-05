import { FileVersionDto } from '../dtos/file-version.dto';
import { FileVersion } from '../../domain/entities';

export class FileVersionMapper {
  static toDto = (entity: FileVersion): FileVersionDto => ({
    id: entity.id,
    mimetype: entity.mimetype,
    size: entity.size,
    versionId: entity.versionId,
    userId: entity.userId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
