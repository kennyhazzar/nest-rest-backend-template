import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { loadConfiguration } from '@libs/common/configuration';
import { BullmqModuleOptions } from './options/bullmq.module.options';
import { DrizzleModule } from './drizzle.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', 'docker/.env'],
      load: [loadConfiguration],
    }),
    BullModule.forRootAsync({ useFactory: BullmqModuleOptions, inject: [ConfigService] }),
    DrizzleModule,
    AuthModule,
  ],
})
export class AppModule {}
