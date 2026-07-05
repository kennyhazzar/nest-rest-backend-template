import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '@/decorators/current-user-id.decorator';
import { Policy } from '@/decorators/policy.decorator';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { IdType } from '@/interfaces/id.type';
import {
  ActivateCaptchaConfigCommand,
  CreateCaptchaConfigDraftCommand,
  CreateCaptchaTemplateCommand,
  EnqueueCaptchaGenerationBatchCommand,
  GenerateCaptchaPreviewCommand,
} from '../../application/commands/captcha.commands';
import {
  GetCaptchaConfigHistoryQuery,
  GetCaptchaMetricsQuery,
  GetCaptchaPoolsQuery,
  GetCaptchaTemplatesQuery,
} from '../../application/queries/captcha.queries';
import {
  CreateCaptchaConfigBody,
  CreateCaptchaTemplateBody,
  EnqueueCaptchaGenerationBatchBody,
  GenerateCaptchaPreviewBody,
} from '../dtos/captcha.dto';
import { CaptchaDifficulty } from '../../domain/captcha.types';

@ApiTags('admin/captcha')
@ApiBearerAuth()
@Controller('admin/captcha')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AdminCaptchaController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('templates')
  @Policy(Actions.READ, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'List captcha templates' })
  @ApiOkResponse({ description: 'Captcha templates.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  templates() {
    return this.queryBus.execute(new GetCaptchaTemplatesQuery());
  }

  @Post('templates')
  @Policy(Actions.CREATE, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Create captcha template' })
  @ApiCreatedResponse({ description: 'Captcha template created.' })
  createTemplate(@Body() input: CreateCaptchaTemplateBody) {
    return this.commandBus.execute(new CreateCaptchaTemplateCommand(input));
  }

  @Get('templates/:id/configs')
  @Policy(Actions.READ, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Get template config history' })
  configs(@Param('id', ParseUUIDPipe) templateId: IdType) {
    return this.queryBus.execute(new GetCaptchaConfigHistoryQuery(templateId));
  }

  @Post('templates/:id/configs')
  @Policy(Actions.CREATE, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Create captcha config draft' })
  createConfig(
    @Param('id', ParseUUIDPipe) templateId: IdType,
    @Body() input: CreateCaptchaConfigBody,
    @CurrentUserId() userId: IdType,
  ) {
    return this.commandBus.execute(new CreateCaptchaConfigDraftCommand(templateId, input.configJson, userId));
  }

  @Post('configs/:id/activate')
  @Policy(Actions.UPDATE, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Activate captcha config and archive previous active config' })
  activate(@Param('id', ParseUUIDPipe) configId: IdType) {
    return this.commandBus.execute(new ActivateCaptchaConfigCommand(configId));
  }

  @Post('configs/:id/preview')
  @Policy(Actions.READ, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Generate non-persistent captcha preview images' })
  preview(@Param('id', ParseUUIDPipe) configId: IdType, @Body() input: GenerateCaptchaPreviewBody) {
    return this.commandBus.execute(
      new GenerateCaptchaPreviewCommand(configId, input.count ?? 3, input.difficulty ?? CaptchaDifficulty.MEDIUM),
    );
  }

  @Post('configs/:id/generate-batch')
  @Policy(Actions.CREATE, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Enqueue pre-generation batch for captcha pool' })
  generateBatch(@Param('id', ParseUUIDPipe) configId: IdType, @Body() input: EnqueueCaptchaGenerationBatchBody) {
    return this.commandBus.execute(
      new EnqueueCaptchaGenerationBatchCommand(
        configId,
        input.count ?? 20,
        input.difficulty ?? CaptchaDifficulty.MEDIUM,
      ),
    );
  }

  @Get('pools')
  @Policy(Actions.READ, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Get Redis captcha pool state' })
  pools() {
    return this.queryBus.execute(new GetCaptchaPoolsQuery());
  }

  @Get('metrics')
  @Policy(Actions.READ, Subjects.CAPTCHA_ADMIN)
  @ApiOperation({ summary: 'Get captcha metrics snapshot' })
  metrics() {
    return this.queryBus.execute(new GetCaptchaMetricsQuery());
  }
}
