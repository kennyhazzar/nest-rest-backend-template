import { Command } from '@nestjs/cqrs';
import { FastifyRequest } from 'fastify';

export class RefreshTokensCommand extends Command<{
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}> {
  constructor(
    public readonly refreshToken: string,
    public readonly request: FastifyRequest,
  ) {
    super();
  }
}
