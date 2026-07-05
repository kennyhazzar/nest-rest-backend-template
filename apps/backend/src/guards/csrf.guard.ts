import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/magic-link/request',
  '/auth/magic-link/authenticate',
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const csrfEnabled = this.configService.get<boolean>('auth.csrf.enabled', false);
    if (!csrfEnabled) {
      return true;
    }

    const req: FastifyRequest = context.switchToHttp().getRequest();

    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return true;
    }

    const rawUrl = req.url.replace(/\?.*$/, '').replace(/^\/api\/v1/, '');
    if (PUBLIC_PATHS.some((p) => rawUrl.endsWith(p))) {
      return true;
    }

    const csrfCookie = req.cookies?.['csrf-token'];
    const csrfHeader = req.headers['x-csrf-token'] as string | undefined;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('common.csrf.invalid');
    }

    return true;
  }
}
