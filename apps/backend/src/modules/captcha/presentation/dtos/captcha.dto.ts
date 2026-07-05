import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import {
  CaptchaChallengeContext,
  CaptchaDifficulty,
  CaptchaTemplateStatus,
  CaptchaTemplateType,
} from '../../domain/captcha.types';

export class CreateCaptchaTemplateBody {
  @ApiProperty({ example: 'svg-text-ru-v1' })
  @IsString()
  @MinLength(3)
  code!: string;

  @ApiProperty({ example: 'SVG Text Russian' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiPropertyOptional({ enum: ['image_text', 'math_expression'], default: 'image_text' })
  @IsOptional()
  @IsEnum(['image_text', 'math_expression'])
  type?: CaptchaTemplateType;

  @ApiPropertyOptional({ enum: CaptchaTemplateStatus, default: CaptchaTemplateStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CaptchaTemplateStatus)
  status?: CaptchaTemplateStatus;

  @ApiPropertyOptional({ enum: CaptchaDifficulty, default: CaptchaDifficulty.MEDIUM })
  @IsOptional()
  @IsEnum(CaptchaDifficulty)
  defaultDifficulty?: CaptchaDifficulty;

  @ApiPropertyOptional({ example: 'svg_text' })
  @IsOptional()
  @IsString()
  generator?: string;
}

export class CreateCaptchaConfigBody {
  @ApiProperty({ example: { width: 320, height: 100, length: 6 } })
  @IsObject()
  configJson!: Record<string, unknown>;
}

export class GenerateCaptchaPreviewBody {
  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional({ enum: CaptchaDifficulty })
  @IsOptional()
  @IsEnum(CaptchaDifficulty)
  difficulty?: CaptchaDifficulty;
}

export class EnqueueCaptchaGenerationBatchBody {
  @ApiPropertyOptional({ minimum: 1, maximum: 500, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  count?: number;

  @ApiPropertyOptional({ enum: CaptchaDifficulty, default: CaptchaDifficulty.MEDIUM })
  @IsOptional()
  @IsEnum(CaptchaDifficulty)
  difficulty?: CaptchaDifficulty;
}

export class CreateCaptchaChallengeBody {
  @ApiProperty({ enum: CaptchaChallengeContext, example: CaptchaChallengeContext.LOGIN })
  @IsEnum(CaptchaChallengeContext)
  context!: CaptchaChallengeContext;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  riskScore?: number;

  @ApiPropertyOptional({ enum: CaptchaDifficulty })
  @IsOptional()
  @IsEnum(CaptchaDifficulty)
  difficulty?: CaptchaDifficulty;

  @ApiPropertyOptional({ example: 'svg-text-ru-v1' })
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional({ description: 'Opaque subject key supplied by AbuseProtectionContext' })
  @IsOptional()
  @IsString()
  subject?: string;
}

export class VerifyCaptchaChallengeBody {
  @ApiProperty({ example: 'A7K9PQ' })
  @IsString()
  @MinLength(1)
  answer!: string;
}

export class CaptchaChallengeDto {
  @ApiProperty({ format: 'uuid' })
  challengeId!: string;

  @ApiProperty({ example: '/api/v1/captcha/challenges/uuid/image' })
  imageUrl!: string;

  @ApiProperty({ example: 180 })
  expiresIn!: number;
}

export class CaptchaVerifyDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  attemptsLeft!: number;
}
