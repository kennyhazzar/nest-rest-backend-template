import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTemplateCommand } from '../commands/create-template.command';
import { TemplateRepository } from '../../domain/repositories/template.repository';

@CommandHandler(CreateTemplateCommand)
export class CreateTemplateHandler implements ICommandHandler<CreateTemplateCommand, string> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(command: CreateTemplateCommand): Promise<string> {
    const template = await this.templateRepository.create(command.payload);
    return template.id;
  }
}
