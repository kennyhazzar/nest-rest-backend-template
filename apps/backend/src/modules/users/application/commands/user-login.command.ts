import { Command } from '@nestjs/cqrs';
import { FastifyReply, FastifyRequest } from 'fastify';

import { AuthResponseDto, LoginBody } from '../../presentation/dtos';

export class UserLoginCommand extends Command<AuthResponseDto> {
  constructor(
    public readonly payload: LoginBody,
    public readonly request: FastifyRequest,
    public readonly reply: FastifyReply,
  ) {
    super();
  }
}
