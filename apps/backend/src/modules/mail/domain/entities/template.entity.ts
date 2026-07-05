export class Template {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly subject: string,
    public readonly content: string | undefined,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(payload: { name: string; subject: string; content?: string; isActive?: boolean }): {
    name: string;
    subject: string;
    content?: string;
    isActive: boolean;
  } {
    return {
      name: payload.name,
      subject: payload.subject,
      content: payload.content,
      isActive: payload.isActive ?? true,
    };
  }

  update(payload: { subject?: string; content?: string; isActive?: boolean }): Template {
    return new Template(
      this.id,
      this.name,
      payload.subject ?? this.subject,
      payload.content ?? this.content,
      payload.isActive ?? this.isActive,
      this.createdAt,
      new Date(),
    );
  }

  deactivate(): Template {
    return new Template(this.id, this.name, this.subject, this.content, false, this.createdAt, new Date());
  }

  activate(): Template {
    return new Template(this.id, this.name, this.subject, this.content, true, this.createdAt, new Date());
  }
}
