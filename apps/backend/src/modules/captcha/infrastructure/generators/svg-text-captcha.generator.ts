import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CaptchaDifficulty } from '../../domain/captcha.types';
import { CaptchaGeneratorPort, GenerateCaptchaInput, GeneratedCaptcha } from '../../application/ports/captcha.ports';

interface SvgTextConfig {
  width: number;
  height: number;
  length: number;
  alphabet: string;
}

@Injectable()
export class SvgTextCaptchaGenerator extends CaptchaGeneratorPort {
  readonly code = 'svg_text';

  async validateConfig(config: unknown): Promise<Record<string, unknown>> {
    const input = (config ?? {}) as Partial<SvgTextConfig>;
    return {
      width: this.clampNumber(input.width, 220, 640, 320),
      height: this.clampNumber(input.height, 80, 180, 100),
      length: this.clampNumber(input.length, 4, 10, 6),
      alphabet:
        typeof input.alphabet === 'string' && input.alphabet.length >= 8
          ? input.alphabet
          : '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
    };
  }

  async generate(input: GenerateCaptchaInput): Promise<GeneratedCaptcha> {
    const config = (await this.validateConfig(input.config)) as unknown as SvgTextConfig;
    const answer = this.randomText(config.alphabet, config.length);
    const noise =
      input.difficulty === CaptchaDifficulty.HARD ? 18 : input.difficulty === CaptchaDifficulty.MEDIUM ? 10 : 5;
    const svg = this.renderSvg(answer, config, noise);

    return {
      answer,
      image: Buffer.from(svg, 'utf8'),
      contentType: 'image/svg+xml; charset=utf-8',
      metadata: { generator: this.code, width: config.width, height: config.height, length: config.length, noise },
    };
  }

  async preview(input: GenerateCaptchaInput & { count: number }): Promise<GeneratedCaptcha[]> {
    const result: GeneratedCaptcha[] = [];
    for (let i = 0; i < input.count; i++) result.push(await this.generate(input));
    return result;
  }

  private randomText(alphabet: string, length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[randomInt(0, alphabet.length)];
    return out;
  }

  private renderSvg(answer: string, config: SvgTextConfig, noise: number): string {
    const chars = [...answer];
    const step = config.width / (chars.length + 1);
    const charNodes = chars
      .map((char, index) => {
        const x = Math.round(step * (index + 1));
        const y = Math.round(config.height / 2 + randomInt(-10, 11));
        const rot = randomInt(-16, 17);
        return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})">${char}</text>`;
      })
      .join('');
    const lines = Array.from({ length: noise })
      .map(() => {
        const x1 = randomInt(0, config.width);
        const y1 = randomInt(0, config.height);
        const x2 = randomInt(0, config.width);
        const y2 = randomInt(0, config.height);
        const opacity = (randomInt(20, 55) / 100).toFixed(2);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" opacity="${opacity}" />`;
      })
      .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${config.width}" height="${config.height}" viewBox="0 0 ${config.width} ${config.height}">
  <rect width="100%" height="100%" fill="#f8fafc"/>
  <g stroke="#64748b" stroke-width="1.4">${lines}</g>
  <g font-family="Arial, sans-serif" font-size="30" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#0f172a">${charNodes}</g>
</svg>`;
  }

  private clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const num = typeof value === 'number' ? value : fallback;
    return Math.min(max, Math.max(min, Math.round(num)));
  }
}
