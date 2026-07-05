import { Query } from '@nestjs/cqrs';
import { Template } from '../../domain/entities/template.entity';

export class GetTemplateByNameQuery extends Query<Template | null> {
  constructor(public readonly name: string) {
    super();
  }
}
