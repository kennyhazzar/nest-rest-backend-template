import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { buildPaginated, toSqlPagination } from '@/common/Paginated';
import { UserRoleRepository } from '../../domain/repositories';
import { UserRolesGetQuery } from '../queries';
import { UserRolesDto } from '../../presentation/dtos';
import { UserRoleMapper } from '../../presentation/mappers';

@QueryHandler(UserRolesGetQuery)
export class UserRolesGetHandler implements IQueryHandler<UserRolesGetQuery> {
  constructor(private readonly userRoleRepository: UserRoleRepository) {}

  async execute(query: UserRolesGetQuery): Promise<UserRolesDto> {
    const page = query.filter?.page ?? 1;
    const perPage = query.filter?.per_page ?? 20;
    const roles = await this.userRoleRepository.find({
      ...query.filter,
      ...toSqlPagination(page, perPage),
    });
    return buildPaginated(roles.map(UserRoleMapper.toDto), roles.totalCount ?? roles.length, page, perPage);
  }
}
