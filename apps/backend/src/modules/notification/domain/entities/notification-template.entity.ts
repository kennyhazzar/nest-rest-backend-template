import { IdType } from '@/interfaces/id.type';

export class NotificationTemplateList {
  constructor(
    public readonly nodes: NotificationTemplate[],
    public readonly totalCount: number,
  ) {}
}

export class NotificationTemplate {
  id!: IdType;
  name!: string;
  subject!: string;
  content!: string;
  isActive!: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;

  constructor(entity: NotificationTemplate) {
    Object.assign(this, entity);
  }

  static create(payload: {
    name: string;
    subject: string;
    content: string;
    isActive?: boolean;
  }): Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: payload.name,
      subject: payload.subject,
      content: payload.content,
      isActive: payload.isActive ?? true,
    };
  }
}
