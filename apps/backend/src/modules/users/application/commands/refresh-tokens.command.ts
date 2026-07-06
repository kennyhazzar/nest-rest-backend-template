import { Command } from '@nestjs/cqrs';
import { FastifyReply, FastifyRequest } from 'fastify';

import { AccessTokenResponseDto } from '../../presentation/dtos';

export class RefreshTokensCommand extends Command<AccessTokenResponseDto> {
  constructor(
    public readonly refreshToken: string,
    public readonly request: FastifyRequest,
    public readonly reply: FastifyReply,
  ) {
    super();
  }
}
