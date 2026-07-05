import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export const BullmqModuleOptions = (configService: ConfigService): BullRootModuleOptions => {
  const environment = configService.getOrThrow('host.environment');
  return {
    connection: {
      host: configService.getOrThrow('redis.host'),
      port: configService.getOrThrow('redis.port'),
      password: configService.get('redis.password'),
      db: environment === 'development' ? 0 : environment === 'production' ? 1 : 2,
    },
  };
};
