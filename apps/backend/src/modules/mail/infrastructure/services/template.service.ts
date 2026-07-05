import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Template } from '../../domain/entities/template.entity';
import { CreateTemplateCommand, UpdateTemplateCommand, DeleteTemplateCommand } from '../../application/commands';
import {
  GetTemplateQuery,
  GetTemplateByNameQuery,
  GetAllTemplatesQuery,
  GetActiveTemplatesQuery,
} from '../../application/queries';

@Injectable()
export class TemplateService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createTemplate(payload: {
    name: string;
    subject: string;
    content: string;
    isActive?: boolean;
  }): Promise<string> {
    return this.commandBus.execute(new CreateTemplateCommand(payload));
  }

  async updateTemplate(
    id: string,
    payload: {
      subject?: string;
      content?: string;
      isActive?: boolean;
    },
  ): Promise<string> {
    return this.commandBus.execute(new UpdateTemplateCommand(id, payload));
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.commandBus.execute(new DeleteTemplateCommand(id));
  }

  async getTemplate(id: string): Promise<Template | null> {
    return this.queryBus.execute(new GetTemplateQuery(id));
  }

  async getTemplateByName(name: string): Promise<Template | null> {
    return this.queryBus.execute(new GetTemplateByNameQuery(name));
  }

  async getAllTemplates(): Promise<Template[]> {
    return this.queryBus.execute(new GetAllTemplatesQuery());
  }

  async getActiveTemplates(): Promise<Template[]> {
    return this.queryBus.execute(new GetActiveTemplatesQuery());
  }
}
