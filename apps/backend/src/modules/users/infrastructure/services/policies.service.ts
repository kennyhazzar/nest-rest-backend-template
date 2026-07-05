import { Injectable, Logger } from '@nestjs/common';

import { RoleType } from '@/enums/role-type.enum';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { AppAbility, CaslAbilityFactory } from '../../../../factories/casl-ability.factory';
import { IRolePermission, RolePermissionRepository } from '../../domain/repositories/role-permission.repository';

/**
 * Service for working with access policies
 */
@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  private readonly abilityCache = new Map<RoleType, AppAbility>();

  constructor(
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly rolePermissionRepository: RolePermissionRepository,
  ) {
    void this.fillAbilities();
  }

  /**
   * Get CASL ability for role
   */
  async getAbilityForRole(roleType: RoleType): Promise<AppAbility | undefined> {
    let ability = this.abilityCache.get(roleType);

    if (!ability) {
      this.logger.warn(`Ability not found in cache for role ${roleType}, attempting to refresh...`);

      try {
        ability = await this.refreshAbilityForRole(roleType);

        if (ability) {
          this.logger.log(`Successfully restored ability for role ${roleType}`);
        } else {
          this.logger.error(`Failed to restore ability for role ${roleType}`);
        }
      } catch (error) {
        this.logger.error(`Failed to refresh ability for role ${roleType}:`, error);
      }
    }

    return ability;
  }

  /**
   * Check permission for role
   */
  hasPermission = (roleType: RoleType, action: Actions, subject: Subjects[] | Subjects): Promise<boolean> =>
    this.rolePermissionRepository.hasPermission(roleType, action, subject);

  /**
   * Fill ability cache for all roles
   */
  async fillAbilities(): Promise<void> {
    try {
      // Get all permissions from DB
      const allPermissions = await this.rolePermissionRepository.find({ isActive: true });

      // Group by role types
      const permissionsByRole = new Map<RoleType, IRolePermission[]>();

      for (const permission of allPermissions) {
        if (!permissionsByRole.has(permission.roleType)) {
          permissionsByRole.set(permission.roleType, []);
        }
        permissionsByRole.get(permission.roleType)!.push(permission);
      }

      // Create abilities for each role
      for (const [roleType, permissions] of permissionsByRole) {
        const ability = this.caslAbilityFactory.createForRolePermissions(permissions);
        this.abilityCache.set(roleType, ability);

        this.logger.debug(`Created ability for role ${roleType} with ${permissions.length} permissions`);
      }

      this.logger.log(`Filled abilities for ${permissionsByRole.size} roles`);
    } catch (error) {
      this.logger.error('Failed to fill abilities:', error);
    }
  }

  /**
   * Refresh ability for specific role
   */
  async refreshAbilityForRole(roleType: RoleType): Promise<AppAbility | undefined> {
    try {
      const permissions = await this.rolePermissionRepository.findByRoleType(roleType);
      const ability = this.caslAbilityFactory.createForRolePermissions(permissions);
      this.abilityCache.set(roleType, ability);

      return ability;
    } catch (error) {
      this.logger.error(`Failed to refresh ability for role ${roleType}:`, error);
    }
  }

  /**
   * Clear cache and recreate all abilities
   */
  async refreshAllAbilities(): Promise<void> {
    this.abilityCache.clear();
    await this.fillAbilities();
  }
}
