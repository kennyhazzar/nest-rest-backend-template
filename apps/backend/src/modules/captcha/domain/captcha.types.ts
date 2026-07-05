export enum CaptchaDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum CaptchaTemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum CaptchaConfigStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum CaptchaAssetStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  USED = 'used',
  EXPIRED = 'expired',
  ARCHIVED = 'archived',
}

export enum CaptchaChallengeContext {
  LOGIN = 'login',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  API_SENSITIVE_ACTION = 'api_sensitive_action',
}

export enum CaptchaChallengeStatus {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export type CaptchaTemplateType = 'image_text' | 'math_expression';

export type CaptchaGeneratorCode = 'svg_text';

export interface CaptchaTemplate {
  id: string;
  code: string;
  name: string;
  type: CaptchaTemplateType;
  status: CaptchaTemplateStatus;
  defaultDifficulty: CaptchaDifficulty;
  generator: CaptchaGeneratorCode | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaptchaConfig {
  id: string;
  templateId: string;
  version: number;
  status: CaptchaConfigStatus;
  configJson: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: Date;
  activatedAt: Date | null;
}

export interface CaptchaAsset {
  id: string;
  templateId: string;
  configId: string;
  storageKey: string;
  answerHash: string;
  answerNormalizedHash: string;
  difficulty: CaptchaDifficulty;
  status: CaptchaAssetStatus;
  generatedAt: Date;
  expiresAt: Date;
  usedCount: number;
  maxUses: number;
  metadataJson: Record<string, unknown>;
}

export interface CaptchaChallenge {
  id: string;
  assetId: string;
  context: CaptchaChallengeContext;
  subjectHash: string | null;
  riskScore: number;
  status: CaptchaChallengeStatus;
  attemptsCount: number;
  expiresAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CaptchaAttempt {
  id: string;
  challengeId: string;
  answerHash: string;
  isSuccess: boolean;
  solveTimeMs: number | null;
  ipHash: string | null;
  userAgentHash: string | null;
  createdAt: Date;
}
