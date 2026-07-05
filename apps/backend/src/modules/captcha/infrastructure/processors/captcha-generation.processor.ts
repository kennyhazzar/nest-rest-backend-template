import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CaptchaDifficulty } from '../../domain/captcha.types';
import { CaptchaAnswerNormalizer } from '../../domain/services/captcha-answer-normalizer.service';
import { CaptchaRepository } from '../../domain/repositories/captcha.repository';
import {
  CaptchaAssetStoragePort,
  CaptchaGeneratorPort,
  CaptchaHashingPort,
  CaptchaPoolPort,
} from '../../application/ports/captcha.ports';

interface GenerateBatchJob {
  configId: string;
  count: number;
  difficulty: CaptchaDifficulty;
}

@Processor('captcha-generation', { concurrency: 2 })
export class CaptchaGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(CaptchaGenerationProcessor.name);

  constructor(
    private readonly repo: CaptchaRepository,
    private readonly generator: CaptchaGeneratorPort,
    private readonly storage: CaptchaAssetStoragePort,
    private readonly pool: CaptchaPoolPort,
    private readonly hashing: CaptchaHashingPort,
    private readonly normalizer: CaptchaAnswerNormalizer,
  ) {
    super();
  }

  async process(job: Job<GenerateBatchJob>): Promise<void> {
    if (job.name !== 'generate-batch') return;
    const config = await this.repo.findConfigById(job.data.configId);
    if (!config) throw new Error('captcha.config.notFound');
    const template = await this.repo.findTemplateById(config.templateId);
    if (!template) throw new Error('captcha.template.notFound');

    for (let i = 0; i < job.data.count; i++) {
      const generated = await this.generator.generate({ config: config.configJson, difficulty: job.data.difficulty });
      const normalized = this.normalizer.normalize(generated.answer);
      const key = `captcha/${template.code}/${config.id}/${Date.now()}-${i}.svg`;
      await this.storage.putObject({
        key,
        body: generated.image,
        contentType: generated.contentType,
        metadata: { templateCode: template.code, configId: config.id },
      });
      const asset = await this.repo.createAsset({
        templateId: template.id,
        configId: config.id,
        storageKey: key,
        answerHash: this.hashing.hashAnswer(generated.answer),
        answerNormalizedHash: this.hashing.hashAnswer(normalized),
        difficulty: job.data.difficulty,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        maxUses: 1,
        metadataJson: generated.metadata,
      });
      await this.pool.pushAsset({ templateCode: template.code, difficulty: job.data.difficulty, assetId: asset.id });
    }

    this.logger.log(
      `captcha-generation: generated ${job.data.count} asset(s), template=${template.code}, difficulty=${job.data.difficulty}`,
    );
  }
}
