import { Query } from '@nestjs/cqrs';
import { Template } from '../../domain/entities/template.entity';

export class GetAllTemplatesQuery extends Query<Template[]> {
  constructor() {
    super();
  }
}
