export class SystemSettingUpdateCommand {
  constructor(
    public readonly key: string,
    public readonly value: string,
  ) {}
}

export class WriteAccessLogCommand {
  constructor(
    public readonly action: string,
    public readonly payload: {
      userId?: string;
      email?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, unknown>;
    } = {},
  ) {}
}
