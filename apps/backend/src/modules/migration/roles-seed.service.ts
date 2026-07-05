import { Injectable, Logger } from '@nestjs/common';
import {
  RolePermissionRepository,
  RolePermissionCreatePayload,
  UserRoleRepository,
} from '@/modules/users/domain/repositories';
import { rolesConfig, rolePermissionsConfig } from './configs/roles.config';

/**
 * Service for seeding roles and permissions
 */
@Injectable()
export class RolesSeedService {
  private readonly logger = new Logger(RolesSeedService.name);

  constructor(
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {}

  /**
   * Seed role permissions
   */
  async seedRolePermissions(): Promise<void> {
    try {
      this.logger.log('Starting to seed role permissions...');

      // Clear existing permissions
      await this.rolePermissionRepository.deleteAll();
      this.logger.debug('Cleared existing permissions');

      // Create new permissions
      const allPermissions: RolePermissionCreatePayload[] = [];

      for (const roleConfig of rolePermissionsConfig) {
        for (const permission of roleConfig.permissions) {
          allPermissions.push({
            roleType: roleConfig.roleType,
            action: permission.action,
            subject: permission.subject,
            description: permission.description,
            isActive: true,
          });
        }
      }

      await this.rolePermissionRepository.createMany(allPermissions);

      this.logger.log(
        `Successfully seeded ${allPermissions.length} permissions for ${rolePermissionsConfig.length} roles`,
      );
    } catch (error) {
      this.logger.error('Failed to seed role permissions:', error);
      throw error;
    }
  }

  /**
   * Check if seeding is needed
   */
  async shouldRolePermissionsSeed(): Promise<boolean> {
    try {
      const existingPermissions = await this.rolePermissionRepository.count();
      const expectedPermissions = rolePermissionsConfig.reduce(
        (total, roleConfig) => total + roleConfig.permissions.length,
        0,
      );
      return existingPermissions !== expectedPermissions;
    } catch (error) {
      this.logger.error('Failed to check if seeding is needed:', error);
      return true;
    }
  }

  /**
   * Check if roles need seeding
   */
  async shouldRoleSeedRoles(): Promise<boolean> {
    try {
      const roles = await this.userRoleRepository.find({ limit: 1 });
      return roles.totalCount === 0;
    } catch (error) {
      this.logger.error('Failed to check if role seeding is needed:', error);
      return true;
    }
  }

  /**
   * Seed roles
   */
  async seedRoles(): Promise<void> {
    await Promise.all(rolesConfig.map((role) => this.userRoleRepository.create(role)));

    // Clear cache after creating roles
    await this.userRoleRepository.clearCache();
  }

  /**
   * Seed roles only if empty
   */
  async seedRolesIfEmpty(): Promise<void> {
    if (await this.shouldRoleSeedRoles()) {
      await this.seedRoles();
    }
  }

  /**
   * Seed permissions only if empty
   */
  async seedRolePermissionsIfEmpty(): Promise<void> {
    if (await this.shouldRolePermissionsSeed()) {
      await this.seedRolePermissions();
    }
  }
}
