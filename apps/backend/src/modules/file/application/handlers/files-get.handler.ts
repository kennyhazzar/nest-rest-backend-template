import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';

import { buildPaginated, toSqlPagination } from '@/common/Paginated';
import { FilesGetQuery } from '../queries';
import { FilesDto } from '../../presentation/dtos/file.dto';
import { FileMapper } from '../../presentation/mappers/file.mapper';
import { FileRepository } from '../../domain/repositories';

@QueryHandler(FilesGetQuery)
export class FilesGetHandler implements IQueryHandler<FilesGetQuery> {
  constructor(private readonly repo: FileRepository) {}

  async execute({ params }: FilesGetQuery): Promise<FilesDto> {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 20;
    const files = await this.repo.find({ ...toSqlPagination(page, perPage) });
    return buildPaginated(files.nodes.map(FileMapper.toDto), files.totalCount, page, perPage);
  }
}
