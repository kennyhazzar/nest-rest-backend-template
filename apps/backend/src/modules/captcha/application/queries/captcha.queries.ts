import { CaptchaDifficulty } from '../../domain/captcha.types';

export class GetCaptchaTemplatesQuery {}

export class GetCaptchaConfigHistoryQuery {
  constructor(public readonly templateId: string) {}
}

export class GetCaptchaImageQuery {
  constructor(public readonly challengeId: string) {}
}

export class GetCaptchaPoolsQuery {}

export class GetCaptchaMetricsQuery {}

export class GetCaptchaPoolSizeQuery {
  constructor(
    public readonly templateCode: string,
    public readonly difficulty: CaptchaDifficulty,
  ) {}
}
