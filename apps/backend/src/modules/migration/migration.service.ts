import { Injectable, Logger } from '@nestjs/common';

import { PoliciesService } from '@/modules/users/infrastructure/services/policies.service';
import { UserSeedService } from './user-seed.service';
import { NotificationTemplateSeedService } from './notification-template-seed.service';

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly userSeedService: UserSeedService,
    private readonly notificationTemplateSeedService: NotificationTemplateSeedService,
    private readonly policiesService: PoliciesService,
  ) {}

  async migrateAndSeed() {
    this.logger.log('Starting migration and seeding...');

    // Seed users and roles
    await this.userSeedService.seedIfEmpty();
    await this.policiesService.refreshAllAbilities();

    // Seed notification templates
    await this.seedNotificationTemplates();

    this.logger.log('Migration and seeding completed successfully');
  }

  private async seedNotificationTemplates() {
    this.logger.debug('Seeding notification templates...');
    await this.notificationTemplateSeedService.seedIfEmpty();
  }
}
