import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isStrongPassword } from 'class-validator';
import { Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { RoleType } from '@/enums';
import { IdType } from '@/interfaces/id.type';
import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { User } from '../users/domain/entities';
import { PasswordService } from '@libs/auth/password.service';
import { RolesSeedService } from './roles-seed.service';
import { UserRepository, UserRoleRepository } from '../users/domain/repositories';

@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly rolesSeedService: RolesSeedService,
    private readonly passwordService: PasswordService,
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async seedIfEmpty(): Promise<IdType> {
    if (process.env.NODE_ENV === 'test') {
      await this.db.execute(sql.raw('TRUNCATE TABLE "user", "role_permission", "user_role", "refresh" CASCADE'));

      // Clear cache after TRUNCATE
      this.logger.debug('Clearing cache after TRUNCATE');
      await this.userRoleRepository.clearCache();
    }

    // Initialize roles
    this.logger.debug('Seeding roles');
    await this.rolesSeedService.seedRolesIfEmpty();

    // Initialize permissions
    this.logger.debug('Seeding role permissions');
    await this.rolesSeedService.seedRolePermissionsIfEmpty();

    // Initialize admin user
    this.logger.debug('Seeding admin user');
    const userAdminId = await this.fillAdminUserId();

    return userAdminId;
  }

  async fillAdminUserId(): Promise<IdType> {
    const userAdminId = await this.userRepository.findIdWithRoleType(RoleType.ADMIN);
    if (!userAdminId) {
      const password = this.configService.getOrThrow<string>('admin.password');
      if (
        !isStrongPassword(password, { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      ) {
        throw new Error('admin.passwordWeak');
      }
      const roleAdmin = await this.userRoleRepository.findByType(RoleType.ADMIN);
      if (!roleAdmin) throw new Error('admin.roleNotFound');
      const hashedPassword = await this.passwordService.hashPassword(password);
      const admin = await this.userRepository.create(
        User.create({
          email: this.configService.getOrThrow<string>('admin.email'),
          password: hashedPassword,
          roleId: roleAdmin.id,
          surname: 'Super',
          name: 'Admin',
          middleName: 'User',
          verified: true,
        }),
      );
      return admin.id;
    }
    return userAdminId;
  }
}
