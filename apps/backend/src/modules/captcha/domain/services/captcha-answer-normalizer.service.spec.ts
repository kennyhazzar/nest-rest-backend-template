import { CaptchaAnswerNormalizer } from './captcha-answer-normalizer.service';

describe('CaptchaAnswerNormalizer', () => {
  const normalizer = new CaptchaAnswerNormalizer();

  it('normalizes case, spaces, punctuation, and yo letter', () => {
    expect(normalizer.normalize('  Ёжик,   TEST!!  ')).toBe('ежик test');
  });

  it('keeps letters and numbers only', () => {
    expect(normalizer.normalize(' A-7_К ')).toBe('a7к');
  });
});
