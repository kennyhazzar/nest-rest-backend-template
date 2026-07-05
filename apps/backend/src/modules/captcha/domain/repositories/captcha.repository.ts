import {
  CaptchaAsset,
  CaptchaAttempt,
  CaptchaChallenge,
  CaptchaChallengeContext,
  CaptchaChallengeStatus,
  CaptchaConfig,
  CaptchaDifficulty,
  CaptchaTemplate,
  CaptchaTemplateStatus,
} from '../captcha.types';

export interface CreateCaptchaTemplateData {
  code: string;
  name: string;
  type: 'image_text' | 'math_expression';
  status: CaptchaTemplateStatus;
  defaultDifficulty: CaptchaDifficulty;
  generator: string;
}

export interface CreateCaptchaConfigData {
  templateId: string;
  version: number;
  configJson: Record<string, unknown>;
  createdByUserId?: string | null;
}

export interface CreateCaptchaAssetData {
  templateId: string;
  configId: string;
  storageKey: string;
  answerHash: string;
  answerNormalizedHash: string;
  difficulty: CaptchaDifficulty;
  expiresAt: Date;
  metadataJson: Record<string, unknown>;
  maxUses: number;
}

export interface CreateCaptchaChallengeData {
  assetId: string;
  context: CaptchaChallengeContext;
  subjectHash?: string | null;
  riskScore: number;
  expiresAt: Date;
}

export interface CreateCaptchaAttemptData {
  challengeId: string;
  answerHash: string;
  isSuccess: boolean;
  solveTimeMs: number | null;
  ipHash: string | null;
  userAgentHash: string | null;
}

export abstract class CaptchaRepository {
  abstract createTemplate(data: CreateCaptchaTemplateData): Promise<CaptchaTemplate>;
  abstract listTemplates(): Promise<CaptchaTemplate[]>;
  abstract findTemplateById(id: string): Promise<CaptchaTemplate | null>;
  abstract findTemplateByCode(code: string): Promise<CaptchaTemplate | null>;

  abstract nextConfigVersion(templateId: string): Promise<number>;
  abstract createConfig(data: CreateCaptchaConfigData): Promise<CaptchaConfig>;
  abstract listConfigs(templateId: string): Promise<CaptchaConfig[]>;
  abstract findConfigById(id: string): Promise<CaptchaConfig | null>;
  abstract findActiveConfig(templateId: string): Promise<CaptchaConfig | null>;
  abstract activateConfig(id: string): Promise<CaptchaConfig>;

  abstract createAsset(data: CreateCaptchaAssetData): Promise<CaptchaAsset>;
  abstract findAssetById(id: string): Promise<CaptchaAsset | null>;
  abstract reserveAsset(id: string): Promise<CaptchaAsset | null>;
  abstract markAssetUsed(id: string): Promise<void>;

  abstract createChallenge(data: CreateCaptchaChallengeData): Promise<CaptchaChallenge>;
  abstract findChallengeById(id: string): Promise<CaptchaChallenge | null>;
  abstract completeChallenge(id: string, status: CaptchaChallengeStatus): Promise<CaptchaChallenge>;
  abstract incrementChallengeAttempts(id: string): Promise<void>;
  abstract createAttempt(data: CreateCaptchaAttemptData): Promise<CaptchaAttempt>;

  abstract countAssetsByStatus(): Promise<Array<{ status: string; difficulty: string; count: number }>>;
  abstract countChallenges(): Promise<{ total: number; passed: number; failed: number; pending: number }>;
}
