import { IBaseEntity } from '@/common/domain/base.entity';
import { RoleType } from '@/enums/role-type.enum';

export interface IUserRole extends IBaseEntity {
  name: string;
  description?: string;
  type: RoleType;
}
