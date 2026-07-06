import Redis from 'ioredis';
import { Injectable, Logger, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IdType } from '@/interfaces/id.type';
import { UserRepository } from '../../domain/repositories';

const KEY_PREFIX = 'auth:user';

@Injectable()
export class AuthTokenVersionService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthTokenVersionService.name);
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    this.redis = new Redis({
      host: this.configService.getOrThrow<string>('redis.host'),
      port: Number(this.configService.getOrThrow<number>('redis.port')),
      password: this.configService.get<string>('redis.password') || undefined,
      maxRetriesPerRequest: 1,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async assertCurrent(userId: IdType, tokenVersion: unknown): Promise<void> {
    if (typeof tokenVersion !== 'number' || !Number.isInteger(tokenVersion)) {
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    const currentVersion = await this.getCurrentVersion(userId);
    if (currentVersion !== tokenVersion) {
      this.logger.warn(
        `Access token rejected: userId=${userId} tokenVersion=${tokenVersion} currentVersion=${currentVersion}`,
      );
      throw new UnauthorizedException('user.auth.tokenStale');
    }
  }

  async bumpVersion(userId: IdType): Promise<number> {
    await this.clearCachedVersion(userId);
    const version = await this.userRepository.incrementTokenVersion(userId);
    try {
      await this.setVersion(userId, version);
    } catch (error) {
      this.logger.error(
        `Failed to cache bumped token version: userId=${userId} version=${version} error=${(error as Error).message}`,
      );
      await this.clearCachedVersion(userId);
    }
    return version;
  }

  async setVersion(userId: IdType, version: number): Promise<void> {
    await this.redis.set(this.key(userId), String(version));
  }

  async getCurrentVersion(userId: IdType): Promise<number> {
    try {
      const cached = await this.redis.get(this.key(userId));
      if (cached !== null) {
        const parsed = Number(cached);
        if (Number.isInteger(parsed)) return parsed;
      }
    } catch (error) {
      this.logger.error(
        `Token version Redis lookup failed, falling back to database: userId=${userId} error=${(error as Error).message}`,
      );
    }

    return this.restoreVersionFromDatabase(userId);
  }

  private async restoreVersionFromDatabase(userId: IdType): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('user.notFound');
    }

    try {
      await this.setVersion(userId, user.tokenVersion);
    } catch (error) {
      this.logger.error(`Failed to restore token version cache: userId=${userId} error=${(error as Error).message}`);
    }
    return user.tokenVersion;
  }

  private async clearCachedVersion(userId: IdType): Promise<void> {
    try {
      await this.redis.del(this.key(userId));
    } catch (error) {
      this.logger.error(`Failed to clear token version cache: userId=${userId} error=${(error as Error).message}`);
    }
  }

  private key(userId: IdType): string {
    return `${KEY_PREFIX}:${userId}:tokenVersion`;
  }
}
