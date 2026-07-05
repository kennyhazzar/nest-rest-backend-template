import { Template } from '../entities/template.entity';

export abstract class TemplateRepository {
  abstract create(template: { name: string; subject: string; content?: string; isActive?: boolean }): Promise<Template>;

  abstract findById(id: string): Promise<Template | null>;

  abstract findByName(name: string): Promise<Template | null>;

  abstract findAll(): Promise<Template[]>;

  abstract findActive(): Promise<Template[]>;

  abstract update(
    id: string,
    update: {
      subject?: string;
      content?: string;
      isActive?: boolean;
    },
  ): Promise<Template>;

  abstract delete(id: string): Promise<void>;

  abstract count(): Promise<number>;
}
