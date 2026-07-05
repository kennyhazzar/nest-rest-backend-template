import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from 'nestjs-pino';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly logger = new PinoLogger({ pinoHttp: { level: 'debug' } });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(tap((data) => this.log(context, data)));
  }

  private log(context: ExecutionContext, data: any) {
    if (context.getType() !== 'http') {
      return;
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();

    this.logger.debug({
      requestId: req.id,
      userId: req.userId,
      roleId: req.roleId,
      roleType: req.roleType,
      language: req.language,
      context: context.getClass().name ?? 'HTTP',
      statusCode: reply.statusCode,
      method: req.method,
      url: req.url,
      responseSummary: summarizeResponse(data),
      msg: 'HTTP request completed',
    });
  }
}

function summarizeResponse(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { type: 'array', length: data.length };
  }

  if (data && typeof data === 'object') {
    return {
      type: 'object',
      keys: Object.keys(data as Record<string, unknown>).filter((key) => !isSensitiveKey(key)),
    };
  }

  return { type: typeof data };
}

function isSensitiveKey(key: string): boolean {
  return ['accessToken', 'refreshToken', 'csrfToken', 'token', 'password', 'currentPassword', 'newPassword'].includes(
    key,
  );
}
