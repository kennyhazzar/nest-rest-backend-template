import { Ability, AbilityBuilder, ExtractSubjectType } from '@casl/ability';
import { Injectable } from '@nestjs/common';

import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import type { IRolePermission } from '@/modules/users/domain/repositories/role-permission.repository';

export type AppAbility = Ability<[Actions, Subjects], Record<string, any>>;

@Injectable()
export class CaslAbilityFactory {
  /**
   * Creates CASL ability based on role permissions
   * @param permissions - array of role permissions
   * @returns CASL ability for permission checking
   */
  createForRolePermissions(permissions: IRolePermission[]): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(Ability);

    permissions.forEach((permission) => {
      can(permission.action, permission.subject);
    });

    return build({
      detectSubjectType: (item: unknown) => item as ExtractSubjectType<Subjects>,
    });
  }
}
