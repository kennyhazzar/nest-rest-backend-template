import { ConfigService } from '@nestjs/config';
import { HmacCaptchaHashingService } from './captcha-hashing.service';

describe('HmacCaptchaHashingService', () => {
  const service = new HmacCaptchaHashingService({
    get: (key: string) => (key === 'captcha.hashPepper' ? 'test-pepper' : undefined),
  } as ConfigService);

  it('hashes answers deterministically without exposing plaintext', () => {
    const hash = service.hashAnswer('abc123');

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain('abc123');
    expect(service.hashAnswer('abc123')).toBe(hash);
  });

  it('compares answers using the same normalized value', () => {
    const hash = service.hashAnswer('abc123');

    expect(service.compareAnswer('abc123', hash)).toBe(true);
    expect(service.compareAnswer('abc124', hash)).toBe(false);
  });
});
