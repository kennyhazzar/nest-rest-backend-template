import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetActiveTemplatesQuery } from '../queries/get-active-templates.query';
import { TemplateRepository } from '../../domain/repositories/template.repository';
import { Template } from '../../domain/entities/template.entity';

@QueryHandler(GetActiveTemplatesQuery)
export class GetActiveTemplatesHandler implements IQueryHandler<GetActiveTemplatesQuery, Template[]> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(): Promise<Template[]> {
    return this.templateRepository.findActive();
  }
}
