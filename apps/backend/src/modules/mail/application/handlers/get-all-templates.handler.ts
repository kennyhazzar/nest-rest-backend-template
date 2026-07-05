import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAllTemplatesQuery } from '../queries/get-all-templates.query';
import { TemplateRepository } from '../../domain/repositories/template.repository';
import { Template } from '../../domain/entities/template.entity';

@QueryHandler(GetAllTemplatesQuery)
export class GetAllTemplatesHandler implements IQueryHandler<GetAllTemplatesQuery, Template[]> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(): Promise<Template[]> {
    return this.templateRepository.findAll();
  }
}
