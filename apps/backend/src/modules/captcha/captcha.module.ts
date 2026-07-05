import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CqrsModule } from '@nestjs/cqrs';
import { FileModule } from '@/modules/file/file.module';
import { UsersModule } from '@/modules/users/users.module';
import { CaptchaRepository } from './domain/repositories/captcha.repository';
import { CaptchaAnswerNormalizer } from './domain/services/captcha-answer-normalizer.service';
import { CaptchaCommandHandlers, CaptchaQueryHandlers } from './application/handlers/captcha.handlers';
import {
  CaptchaAssetStoragePort,
  CaptchaGeneratorPort,
  CaptchaHashingPort,
  CaptchaPoolPort,
} from './application/ports/captcha.ports';
import { CaptchaRepositoryDrizzle } from './infrastructure/repositories/captcha.repository.drizzle';
import { HmacCaptchaHashingService } from './infrastructure/hashing/captcha-hashing.service';
import { RedisCaptchaPool } from './infrastructure/redis/redis-captcha-pool';
import { S3CaptchaAssetStorage } from './infrastructure/storage/s3-captcha-asset-storage';
import { SvgTextCaptchaGenerator } from './infrastructure/generators/svg-text-captcha.generator';
import { CaptchaGenerationProcessor } from './infrastructure/processors/captcha-generation.processor';
import { CaptchaController } from './presentation/controllers/captcha.controller';
import { AdminCaptchaController } from './presentation/controllers/admin-captcha.controller';

@Module({
  imports: [CqrsModule, FileModule, UsersModule, BullModule.registerQueue({ name: 'captcha-generation' })],
  controllers: [CaptchaController, AdminCaptchaController],
  providers: [
    ...CaptchaCommandHandlers,
    ...CaptchaQueryHandlers,
    CaptchaAnswerNormalizer,
    CaptchaGenerationProcessor,
    { provide: CaptchaRepository, useClass: CaptchaRepositoryDrizzle },
    { provide: CaptchaHashingPort, useClass: HmacCaptchaHashingService },
    { provide: CaptchaPoolPort, useClass: RedisCaptchaPool },
    { provide: CaptchaAssetStoragePort, useClass: S3CaptchaAssetStorage },
    { provide: CaptchaGeneratorPort, useClass: SvgTextCaptchaGenerator },
  ],
})
export class CaptchaModule {}
