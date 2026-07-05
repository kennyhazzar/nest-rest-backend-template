import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { buildPaginated, toSqlPagination } from '@/common/Paginated';
import { UserRepository } from '../../domain/repositories';
import { UsersGetQuery } from '../queries';
import { UsersDto } from '../../presentation/dtos';
import { UserMapper } from '../../presentation/mappers';

@QueryHandler(UsersGetQuery)
export class UsersGetHandler implements IQueryHandler<UsersGetQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: UsersGetQuery): Promise<UsersDto> {
    const page = query.filter?.page ?? 1;
    const perPage = query.filter?.per_page ?? 20;
    const users = await this.userRepository.find({
      ...query.filter,
      ...toSqlPagination(page, perPage),
    });
    return buildPaginated(users.map(UserMapper.toDto), users.totalCount ?? users.length, page, perPage);
  }
}
