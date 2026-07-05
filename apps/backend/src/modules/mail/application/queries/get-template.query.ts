import { Query } from '@nestjs/cqrs';
import { Template } from '../../domain/entities/template.entity';

export class GetTemplateQuery extends Query<Template | null> {
  constructor(public readonly id: string) {
    super();
  }
}
