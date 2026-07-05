import { Query } from '@nestjs/cqrs';
import { Template } from '../../domain/entities/template.entity';

export class GetActiveTemplatesQuery extends Query<Template[]> {
  constructor() {
    super();
  }
}
