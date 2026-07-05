import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetTemplateQuery } from '../queries/get-template.query';
import { TemplateRepository } from '../../domain/repositories/template.repository';
import { Template } from '../../domain/entities/template.entity';

@QueryHandler(GetTemplateQuery)
export class GetTemplateHandler implements IQueryHandler<GetTemplateQuery, Template | null> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(query: GetTemplateQuery): Promise<Template | null> {
    return this.templateRepository.findById(query.id);
  }
}
