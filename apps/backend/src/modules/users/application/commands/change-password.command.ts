import { IdType } from '@/interfaces/id.type';

export class ChangePasswordCommand {
  constructor(
    public readonly userId: IdType,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
