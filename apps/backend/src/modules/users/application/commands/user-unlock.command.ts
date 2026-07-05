import { IdType } from '@/interfaces/id.type';

export class UserUnlockCommand {
  constructor(public readonly userId: IdType) {}
}
