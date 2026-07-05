import { CaptchaChallengeContext, CaptchaDifficulty, CaptchaTemplateStatus } from '../../domain/captcha.types';

export class CreateCaptchaTemplateCommand {
  constructor(
    public readonly input: {
      code: string;
      name: string;
      type?: 'image_text' | 'math_expression';
      status?: CaptchaTemplateStatus;
      defaultDifficulty?: CaptchaDifficulty;
      generator?: string;
    },
  ) {}
}

export class CreateCaptchaConfigDraftCommand {
  constructor(
    public readonly templateId: string,
    public readonly configJson: Record<string, unknown>,
    public readonly createdByUserId?: string | null,
  ) {}
}

export class ActivateCaptchaConfigCommand {
  constructor(public readonly configId: string) {}
}

export class GenerateCaptchaPreviewCommand {
  constructor(
    public readonly configId: string,
    public readonly count: number,
    public readonly difficulty?: CaptchaDifficulty,
  ) {}
}

export class EnqueueCaptchaGenerationBatchCommand {
  constructor(
    public readonly configId: string,
    public readonly count: number,
    public readonly difficulty: CaptchaDifficulty,
  ) {}
}

export class CreateCaptchaChallengeCommand {
  constructor(
    public readonly input: {
      context: CaptchaChallengeContext;
      riskScore?: number;
      difficulty?: CaptchaDifficulty;
      templateCode?: string;
      subject?: string | null;
    },
  ) {}
}

export class VerifyCaptchaChallengeCommand {
  constructor(
    public readonly challengeId: string,
    public readonly answer: string,
    public readonly meta: { ip?: string | null; userAgent?: string | null },
  ) {}
}
