import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteTemplateCommand } from '../commands/delete-template.command';
import { TemplateRepository } from '../../domain/repositories/template.repository';

@CommandHandler(DeleteTemplateCommand)
export class DeleteTemplateHandler implements ICommandHandler<DeleteTemplateCommand, void> {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(command: DeleteTemplateCommand): Promise<void> {
    await this.templateRepository.delete(command.id);
  }
}
