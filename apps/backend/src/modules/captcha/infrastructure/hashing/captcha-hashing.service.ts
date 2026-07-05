import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptchaHashingPort } from '../../application/ports/captcha.ports';

@Injectable()
export class HmacCaptchaHashingService extends CaptchaHashingPort {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    super();
    this.secret =
      configService.get<string>('captcha.hashPepper') ??
      configService.get<string>('jwt.access.secret') ??
      configService.get<string>('jwt.secret') ??
      'development-captcha-secret-change-me';
  }

  hashAnswer(normalizedAnswer: string): string {
    return this.hmac(`answer:${normalizedAnswer}`);
  }

  compareAnswer(normalizedAnswer: string, hash: string): boolean {
    const expected = Buffer.from(this.hashAnswer(normalizedAnswer));
    const actual = Buffer.from(hash);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  hashLookup(value: string): string {
    return this.hmac(`lookup:${value}`);
  }

  private hmac(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }
}
