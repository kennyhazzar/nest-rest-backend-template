import * as argon2 from 'argon2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PasswordHashType } from '@/enums/password-hash-type.enum';
import { PasswordService } from '@/modules/users/domain/services/password.service';

/**
 * Password service implementation using Argon2id
 * Supports smooth migration from legacy HMAC-SHA256
 */
@Injectable()
export class PasswordServiceAdapter extends PasswordService {
  private readonly logger = new Logger(PasswordServiceAdapter.name);

  /** Secret for legacy HMAC hashing */
  private readonly hmacSecret: string;
  /** Algorithm for legacy HMAC hashing */
  private readonly hmacAlgorithm: string;

  /**
   * Argon2id parameters according to OWASP 2024 recommendations
   * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
   */
  private readonly argon2Options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
    hashLength: 32, // 32 bytes
  };

  constructor(private readonly configService: ConfigService) {
    super();
    this.hmacSecret = this.configService.getOrThrow<string>('jwt.access.token');
    this.hmacAlgorithm = this.configService.get<string>('jwt.algorithm', 'sha256');
  }

  /**
   * Hashes password using Argon2id
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password.normalize(), this.argon2Options);
  }

  /**
   * Verifies password
   * Automatically detects hash type and uses corresponding algorithm
   */
  async verifyPassword(storedHash: string, password: string): Promise<boolean> {
    const hashType = this.detectHashType(storedHash);

    if (hashType === PasswordHashType.ARGON2ID) {
      try {
        return await argon2.verify(storedHash, password.normalize());
      } catch (error) {
        this.logger.error('Argon2 verification failed', error);
        return false;
      }
    }

    // Legacy HMAC-SHA256 verification with timing-safe comparison
    return this.verifyHmacPassword(storedHash, password);
  }

  /**
   * Detects algorithm type by hash format
   * Argon2id hashes start with '$argon2id$'
   * HMAC-SHA256 hashes are 64 hex characters
   */
  detectHashType(hash: string): PasswordHashType {
    if (hash.startsWith('$argon2id$')) {
      return PasswordHashType.ARGON2ID;
    }
    return PasswordHashType.HMAC_SHA256;
  }

  /**
   * Checks if rehashing is needed
   * Legacy hashes always require migration
   * Argon2id hashes checked for parameter updates
   */
  needsRehash(hash: string): boolean {
    const hashType = this.detectHashType(hash);

    if (hashType === PasswordHashType.HMAC_SHA256) {
      return true; // All legacy hashes require migration
    }

    // Check if Argon2 parameters are up to date
    try {
      return argon2.needsRehash(hash, this.argon2Options);
    } catch {
      return true;
    }
  }

  /**
   * Verifies legacy HMAC-SHA256 password
   * Uses timing-safe comparison to protect against timing attacks
   */
  private verifyHmacPassword(storedHash: string, password: string): boolean {
    const hmac = createHmac(this.hmacAlgorithm, this.hmacSecret);
    hmac.update(password.normalize());
    const computedHash = hmac.digest('hex');

    // Timing-safe comparison
    const storedBuffer = Buffer.from(storedHash, 'utf8');
    const computedBuffer = Buffer.from(computedHash, 'utf8');

    if (storedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return timingSafeEqual(storedBuffer, computedBuffer);
  }
}
