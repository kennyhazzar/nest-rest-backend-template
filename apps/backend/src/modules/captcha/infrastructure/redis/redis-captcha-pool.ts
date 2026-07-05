import Redis from 'ioredis';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptchaDifficulty } from '../../domain/captcha.types';
import { CaptchaPoolPort, PopCaptchaAssetInput, PushCaptchaAssetInput } from '../../application/ports/captcha.ports';

@Injectable()
export class RedisCaptchaPool extends CaptchaPoolPort implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: configService.getOrThrow<string>('redis.host'),
      port: Number(configService.getOrThrow<number>('redis.port')),
      password: configService.get<string>('redis.password') || undefined,
    });
    this.prefix = configService.get<string>('captcha.redisPrefix', 'captcha');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async pushAsset(input: PushCaptchaAssetInput): Promise<void> {
    await this.redis.lpush(this.key(input.templateCode, input.difficulty), input.assetId);
  }

  async popAsset(input: PopCaptchaAssetInput): Promise<string | null> {
    return this.redis.rpop(this.key(input.templateCode, input.difficulty));
  }

  async getPoolSize(templateCode: string, difficulty: CaptchaDifficulty): Promise<number> {
    return this.redis.llen(this.key(templateCode, difficulty));
  }

  private key(templateCode: string, difficulty: CaptchaDifficulty): string {
    return `${this.prefix}:pool:${templateCode}:${difficulty}`;
  }
}
