import { Injectable } from '@nestjs/common';

@Injectable()
export class CaptchaAnswerNormalizer {
  normalize(answer: string): string {
    return answer
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
  }
}
