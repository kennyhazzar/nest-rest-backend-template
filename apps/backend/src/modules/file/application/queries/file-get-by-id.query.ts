import { Query } from '@nestjs/cqrs';
import { FileDto } from '../../presentation/dtos/file.dto';

export class FileGetByIdQuery extends Query<FileDto> {
  constructor(public readonly payload: { id: string }) {
    super();
  }
}
