import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IdType } from '@/interfaces/id.type';
import {
  CreateCaptchaChallengeCommand,
  VerifyCaptchaChallengeCommand,
} from '../../application/commands/captcha.commands';
import { GetCaptchaImageQuery } from '../../application/queries/captcha.queries';
import {
  CaptchaChallengeDto,
  CaptchaVerifyDto,
  CreateCaptchaChallengeBody,
  VerifyCaptchaChallengeBody,
} from '../dtos/captcha.dto';

@ApiTags('captcha')
@Controller('captcha/challenges')
export class CaptchaController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a captcha challenge from a pre-generated pool asset' })
  @ApiCreatedResponse({ type: CaptchaChallengeDto })
  create(@Body() input: CreateCaptchaChallengeBody): Promise<CaptchaChallengeDto> {
    return this.commandBus.execute(new CreateCaptchaChallengeCommand(input));
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Stream captcha challenge image through backend proxy' })
  async image(@Param('id', ParseUUIDPipe) id: IdType, @Res() reply: FastifyReply): Promise<void> {
    const result = await this.queryBus.execute<
      GetCaptchaImageQuery,
      { stream: NodeJS.ReadableStream; contentType?: string }
    >(new GetCaptchaImageQuery(id));
    reply.header('Content-Type', result.contentType ?? 'image/svg+xml; charset=utf-8');
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    await reply.send(result.stream);
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify captcha challenge answer' })
  @ApiOkResponse({ type: CaptchaVerifyDto })
  verify(
    @Param('id', ParseUUIDPipe) id: IdType,
    @Body() input: VerifyCaptchaChallengeBody,
    @Req() req: FastifyRequest,
  ): Promise<CaptchaVerifyDto> {
    return this.commandBus.execute(
      new VerifyCaptchaChallengeCommand(id, input.answer, {
        ip: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      }),
    );
  }
}
