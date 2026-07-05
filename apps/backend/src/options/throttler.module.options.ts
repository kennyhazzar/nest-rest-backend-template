import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

export const ThrottlerOptions = (configService: ConfigService): ThrottlerModuleOptions => ({
  throttlers: [
    {
      ttl: configService.get<number>('throttle.ttl', 60000), // 60 seconds
      limit: configService.get<number>('throttle.limit', 100), // 100 requests per TTL
    },
  ],
});
