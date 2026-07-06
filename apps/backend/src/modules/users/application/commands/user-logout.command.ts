import { Command } from '@nestjs/cqrs';
import { FastifyReply } from 'fastify';

import { LogoutResponseDto } from '../../presentation/dtos';

export class UserLogoutCommand extends Command<LogoutResponseDto> {
  constructor(
    public readonly refreshToken: string,
    public readonly reply: FastifyReply,
  ) {
    super();
  }
}
