import {
  ConflictException,
  GoneException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  CaptchaAssetStatus,
  CaptchaChallengeStatus,
  CaptchaConfigStatus,
  CaptchaDifficulty,
  CaptchaTemplateStatus,
} from '../../domain/captcha.types';
import { CaptchaAnswerNormalizer } from '../../domain/services/captcha-answer-normalizer.service';
import { CaptchaRepository } from '../../domain/repositories/captcha.repository';
import {
  CaptchaAssetStoragePort,
  CaptchaGeneratorPort,
  CaptchaHashingPort,
  CaptchaPoolPort,
} from '../ports/captcha.ports';
import {
  ActivateCaptchaConfigCommand,
  CreateCaptchaChallengeCommand,
  CreateCaptchaConfigDraftCommand,
  CreateCaptchaTemplateCommand,
  EnqueueCaptchaGenerationBatchCommand,
  GenerateCaptchaPreviewCommand,
  VerifyCaptchaChallengeCommand,
} from '../commands/captcha.commands';
import {
  GetCaptchaConfigHistoryQuery,
  GetCaptchaImageQuery,
  GetCaptchaMetricsQuery,
  GetCaptchaPoolsQuery,
  GetCaptchaTemplatesQuery,
} from '../queries/captcha.queries';

const DEFAULT_TEMPLATE_CODE = 'svg-text-ru-v1';

@CommandHandler(CreateCaptchaTemplateCommand)
export class CreateCaptchaTemplateHandler implements ICommandHandler<CreateCaptchaTemplateCommand> {
  constructor(private readonly repo: CaptchaRepository) {}

  async execute({ input }: CreateCaptchaTemplateCommand) {
    return this.repo.createTemplate({
      code: input.code,
      name: input.name,
      type: input.type ?? 'image_text',
      status: input.status ?? CaptchaTemplateStatus.ACTIVE,
      defaultDifficulty: input.defaultDifficulty ?? CaptchaDifficulty.MEDIUM,
      generator: input.generator ?? 'svg_text',
    });
  }
}

@CommandHandler(CreateCaptchaConfigDraftCommand)
export class CreateCaptchaConfigDraftHandler implements ICommandHandler<CreateCaptchaConfigDraftCommand> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly generator: CaptchaGeneratorPort,
  ) {}

  async execute({ templateId, configJson, createdByUserId }: CreateCaptchaConfigDraftCommand) {
    const template = await this.repo.findTemplateById(templateId);
    if (!template) throw new NotFoundException('captcha.template.notFound');
    if (template.generator !== this.generator.code)
      throw new UnprocessableEntityException('captcha.generator.unsupported');

    const validated = await this.generator.validateConfig(configJson);
    const version = await this.repo.nextConfigVersion(templateId);
    return this.repo.createConfig({ templateId, version, configJson: validated, createdByUserId });
  }
}

@CommandHandler(ActivateCaptchaConfigCommand)
export class ActivateCaptchaConfigHandler implements ICommandHandler<ActivateCaptchaConfigCommand> {
  constructor(private readonly repo: CaptchaRepository) {}

  async execute({ configId }: ActivateCaptchaConfigCommand) {
    return this.repo.activateConfig(configId);
  }
}

@CommandHandler(GenerateCaptchaPreviewCommand)
export class GenerateCaptchaPreviewHandler implements ICommandHandler<GenerateCaptchaPreviewCommand> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly generator: CaptchaGeneratorPort,
  ) {}

  async execute({ configId, count, difficulty }: GenerateCaptchaPreviewCommand) {
    const config = await this.repo.findConfigById(configId);
    if (!config) throw new NotFoundException('captcha.config.notFound');
    const generated = await this.generator.preview({
      config: config.configJson,
      difficulty: difficulty ?? CaptchaDifficulty.MEDIUM,
      count,
    });
    return generated.map((item) => ({
      contentType: item.contentType,
      imageBase64: item.image.toString('base64'),
      metadata: item.metadata,
    }));
  }
}

@CommandHandler(EnqueueCaptchaGenerationBatchCommand)
export class EnqueueCaptchaGenerationBatchHandler implements ICommandHandler<EnqueueCaptchaGenerationBatchCommand> {
  constructor(
    private readonly repo: CaptchaRepository,
    @InjectQueue('captcha-generation') private readonly queue: Queue,
  ) {}

  async execute({ configId, count, difficulty }: EnqueueCaptchaGenerationBatchCommand) {
    const config = await this.repo.findConfigById(configId);
    if (!config) throw new NotFoundException('captcha.config.notFound');
    if (config.status !== CaptchaConfigStatus.ACTIVE) throw new ConflictException('captcha.config.notActive');

    await this.queue.add(
      'generate-batch',
      { configId, count, difficulty },
      { attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 100, removeOnFail: 100 },
    );
    return { queued: true, count, difficulty };
  }
}

@CommandHandler(CreateCaptchaChallengeCommand)
export class CreateCaptchaChallengeHandler implements ICommandHandler<CreateCaptchaChallengeCommand> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly pool: CaptchaPoolPort,
    private readonly hashing: CaptchaHashingPort,
    private readonly configService: ConfigService,
  ) {}

  async execute({ input }: CreateCaptchaChallengeCommand) {
    const templateCode = input.templateCode ?? DEFAULT_TEMPLATE_CODE;
    const template = await this.repo.findTemplateByCode(templateCode);
    if (!template || template.status !== CaptchaTemplateStatus.ACTIVE) {
      throw new NotFoundException('captcha.template.notFound');
    }

    const difficulty = input.difficulty ?? template.defaultDifficulty;
    let assetId = await this.pool.popAsset({ templateCode, difficulty });
    let asset = assetId ? await this.repo.reserveAsset(assetId) : null;

    while (assetId && !asset) {
      assetId = await this.pool.popAsset({ templateCode, difficulty });
      asset = assetId ? await this.repo.reserveAsset(assetId) : null;
    }

    if (!asset) {
      throw new ServiceUnavailableException('captcha.pool.empty');
    }

    const ttl = this.configService.get<number>('captcha.challengeTtlSeconds', 180);
    const challenge = await this.repo.createChallenge({
      assetId: asset.id,
      context: input.context,
      subjectHash: input.subject ? this.hashing.hashLookup(input.subject) : null,
      riskScore: input.riskScore ?? 0,
      expiresAt: new Date(Date.now() + ttl * 1000),
    });

    return {
      challengeId: challenge.id,
      imageUrl: `/api/v1/captcha/challenges/${challenge.id}/image`,
      expiresIn: ttl,
    };
  }
}

@CommandHandler(VerifyCaptchaChallengeCommand)
export class VerifyCaptchaChallengeHandler implements ICommandHandler<VerifyCaptchaChallengeCommand> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly normalizer: CaptchaAnswerNormalizer,
    private readonly hashing: CaptchaHashingPort,
    private readonly configService: ConfigService,
  ) {}

  async execute({ challengeId, answer, meta }: VerifyCaptchaChallengeCommand) {
    const challenge = await this.repo.findChallengeById(challengeId);
    if (!challenge) throw new NotFoundException('captcha.challenge.notFound');
    if (challenge.status !== CaptchaChallengeStatus.PENDING) throw new ConflictException('captcha.challenge.closed');
    if (challenge.expiresAt.getTime() <= Date.now()) {
      await this.repo.completeChallenge(challenge.id, CaptchaChallengeStatus.EXPIRED);
      throw new GoneException('captcha.challenge.expired');
    }

    const maxAttempts = this.configService.get<number>('captcha.maxAttemptsPerChallenge', 2);
    if (challenge.attemptsCount >= maxAttempts) throw new ConflictException('captcha.challenge.tooManyAttempts');

    const asset = await this.repo.findAssetById(challenge.assetId);
    if (!asset || asset.status !== CaptchaAssetStatus.RESERVED)
      throw new ConflictException('captcha.asset.notReserved');

    const normalized = this.normalizer.normalize(answer);
    const success = this.hashing.compareAnswer(normalized, asset.answerNormalizedHash);
    await this.repo.incrementChallengeAttempts(challenge.id);
    await this.repo.createAttempt({
      challengeId: challenge.id,
      answerHash: this.hashing.hashAnswer(normalized),
      isSuccess: success,
      solveTimeMs: Date.now() - challenge.createdAt.getTime(),
      ipHash: meta.ip ? this.hashing.hashLookup(meta.ip) : null,
      userAgentHash: meta.userAgent ? this.hashing.hashLookup(meta.userAgent) : null,
    });

    if (success) {
      await this.repo.completeChallenge(challenge.id, CaptchaChallengeStatus.PASSED);
      await this.repo.markAssetUsed(asset.id);
      return { success: true, attemptsLeft: 0 };
    }

    const attemptsAfter = challenge.attemptsCount + 1;
    const attemptsLeft = Math.max(0, maxAttempts - attemptsAfter);
    if (attemptsLeft === 0) {
      await this.repo.completeChallenge(challenge.id, CaptchaChallengeStatus.FAILED);
      await this.repo.markAssetUsed(asset.id);
    }

    return { success: false, attemptsLeft };
  }
}

@QueryHandler(GetCaptchaTemplatesQuery)
export class GetCaptchaTemplatesHandler implements IQueryHandler<GetCaptchaTemplatesQuery> {
  constructor(private readonly repo: CaptchaRepository) {}

  execute() {
    return this.repo.listTemplates();
  }
}

@QueryHandler(GetCaptchaConfigHistoryQuery)
export class GetCaptchaConfigHistoryHandler implements IQueryHandler<GetCaptchaConfigHistoryQuery> {
  constructor(private readonly repo: CaptchaRepository) {}

  execute({ templateId }: GetCaptchaConfigHistoryQuery) {
    return this.repo.listConfigs(templateId);
  }
}

@QueryHandler(GetCaptchaImageQuery)
export class GetCaptchaImageHandler implements IQueryHandler<GetCaptchaImageQuery> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly storage: CaptchaAssetStoragePort,
  ) {}

  async execute({ challengeId }: GetCaptchaImageQuery) {
    const challenge = await this.repo.findChallengeById(challengeId);
    if (!challenge) throw new NotFoundException('captcha.challenge.notFound');
    if (challenge.status !== CaptchaChallengeStatus.PENDING || challenge.expiresAt.getTime() <= Date.now()) {
      throw new GoneException('captcha.challenge.expired');
    }
    const asset = await this.repo.findAssetById(challenge.assetId);
    if (!asset) throw new NotFoundException('captcha.asset.notFound');
    return this.storage.getObjectStream(asset.storageKey);
  }
}

@QueryHandler(GetCaptchaPoolsQuery)
export class GetCaptchaPoolsHandler implements IQueryHandler<GetCaptchaPoolsQuery> {
  constructor(
    private readonly repo: CaptchaRepository,
    private readonly pool: CaptchaPoolPort,
  ) {}

  async execute() {
    const templates = await this.repo.listTemplates();
    const rows: Array<{ templateCode: string; difficulty: CaptchaDifficulty; size: number }> = [];
    for (const template of templates) {
      for (const difficulty of Object.values(CaptchaDifficulty)) {
        rows.push({
          templateCode: template.code,
          difficulty,
          size: await this.pool.getPoolSize(template.code, difficulty),
        });
      }
    }
    return rows;
  }
}

@QueryHandler(GetCaptchaMetricsQuery)
export class GetCaptchaMetricsHandler implements IQueryHandler<GetCaptchaMetricsQuery> {
  constructor(private readonly repo: CaptchaRepository) {}

  async execute() {
    return {
      assets: await this.repo.countAssetsByStatus(),
      challenges: await this.repo.countChallenges(),
    };
  }
}

export const CaptchaCommandHandlers = [
  CreateCaptchaTemplateHandler,
  CreateCaptchaConfigDraftHandler,
  ActivateCaptchaConfigHandler,
  GenerateCaptchaPreviewHandler,
  EnqueueCaptchaGenerationBatchHandler,
  CreateCaptchaChallengeHandler,
  VerifyCaptchaChallengeHandler,
];

export const CaptchaQueryHandlers = [
  GetCaptchaTemplatesHandler,
  GetCaptchaConfigHistoryHandler,
  GetCaptchaImageHandler,
  GetCaptchaPoolsHandler,
  GetCaptchaMetricsHandler,
];
