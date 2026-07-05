import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetTemplateByNameQuery } from '../queries/get-template-by-name.query';
import { TemplateRepository } from '../../domain/repositories/template.repository';
import { Template } from '../../domain/entities/template.entity';

@QueryHandler(GetTemplateByNameQuery)
export class GetTemplateByNameHandler implements IQueryHandler<GetTemplateByNameQuery, Template | null> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(query: GetTemplateByNameQuery): Promise<Template | null> {
    return this.templateRepository.findByName(query.name);
  }
}
