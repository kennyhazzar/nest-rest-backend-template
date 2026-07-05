import { Readable } from 'node:stream';
import { CaptchaDifficulty } from '../../domain/captcha.types';

export interface PutCaptchaObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export abstract class CaptchaAssetStoragePort {
  abstract putObject(input: PutCaptchaObjectInput): Promise<{ storageKey: string }>;
  abstract getObjectStream(storageKey: string): Promise<{ stream: Readable; contentType?: string }>;
}

export interface PushCaptchaAssetInput {
  templateCode: string;
  difficulty: CaptchaDifficulty;
  assetId: string;
}

export interface PopCaptchaAssetInput {
  templateCode: string;
  difficulty: CaptchaDifficulty;
}

export abstract class CaptchaPoolPort {
  abstract pushAsset(input: PushCaptchaAssetInput): Promise<void>;
  abstract popAsset(input: PopCaptchaAssetInput): Promise<string | null>;
  abstract getPoolSize(templateCode: string, difficulty: CaptchaDifficulty): Promise<number>;
}

export interface GeneratedCaptcha {
  answer: string;
  image: Buffer;
  contentType: string;
  metadata: Record<string, unknown>;
}

export interface GenerateCaptchaInput {
  config: Record<string, unknown>;
  difficulty: CaptchaDifficulty;
}

export abstract class CaptchaGeneratorPort {
  abstract readonly code: string;
  abstract generate(input: GenerateCaptchaInput): Promise<GeneratedCaptcha>;
  abstract preview(input: GenerateCaptchaInput & { count: number }): Promise<GeneratedCaptcha[]>;
  abstract validateConfig(config: unknown): Promise<Record<string, unknown>>;
}

export abstract class CaptchaHashingPort {
  abstract hashAnswer(normalizedAnswer: string): string;
  abstract compareAnswer(normalizedAnswer: string, hash: string): boolean;
  abstract hashLookup(value: string): string;
}
