import { IdType } from '@/interfaces/id.type';

export class AdminResetPasswordCommand {
  constructor(public readonly userId: IdType) {}
}
