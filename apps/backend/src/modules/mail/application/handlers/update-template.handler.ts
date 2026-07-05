import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTemplateCommand } from '../commands/update-template.command';
import { TemplateRepository } from '../../domain/repositories/template.repository';

@CommandHandler(UpdateTemplateCommand)
export class UpdateTemplateHandler implements ICommandHandler<UpdateTemplateCommand, string> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(command: UpdateTemplateCommand): Promise<string> {
    const template = await this.templateRepository.update(command.id, command.payload);
    return template.id;
  }
}
