import { FastifyReply, FastifyRequest } from 'fastify';
import { BaseExceptionFilter } from '@nestjs/core';
import { Catch, ArgumentsHost, HttpException, HttpServer, HttpStatus } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { I18nService } from '@/i18n';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter<HttpException> {
  private readonly logger = new PinoLogger({ pinoHttp: { level: 'debug' } });

  constructor(
    applicationRef: HttpServer,
    private readonly i18n?: I18nService,
  ) {
    super(applicationRef);
  }

  catch(exception: HttpException | Error, host: ArgumentsHost) {
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Detect pg/Drizzle database errors BEFORE reading exception.message
    // to prevent leaking table names, constraint names, and column data.
    const dbErrorResult = this.parseDatabaseError(exception);

    if (exception instanceof HttpException && typeof exception.getStatus === 'function') {
      try {
        status = exception.getStatus();
      } catch {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } else if (dbErrorResult) {
      status = dbErrorResult.status;
    }

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const translationArgs =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && 'args' in exceptionResponse
        ? ((exceptionResponse as { args?: Record<string, unknown> }).args ?? undefined)
        : undefined;
    const rawMessage =
      exception instanceof HttpException
        ? (() => {
            const res = exceptionResponse;
            if (typeof res === 'object' && res !== null && 'message' in res) {
              const msg = (res as any).message;
              return Array.isArray(msg) ? msg[0] : msg;
            }
            return exception.message;
          })()
        : (dbErrorResult?.safeMessage ?? 'common.server.internal');
    const normalizedMessage = this.normalizeFrameworkMessage(rawMessage, status);
    const language = request?.language ?? request?.headers?.['accept-language']?.toString();
    const message = this.i18n?.translate(normalizedMessage, language, translationArgs) ?? normalizedMessage;
    const messageKey =
      typeof normalizedMessage === 'string' && this.i18n?.isTranslationKey(normalizedMessage)
        ? normalizedMessage
        : undefined;

    try {
      const payload = {
        msg: exception?.message,
        requestId: request?.id,
        userId: request?.userId,
        roleId: request?.roleId,
        roleType: request?.roleType,
        language,
        context: 'HTTP',
        statusCode: status,
        method: request?.method,
        url: request?.url,
        responseStatusCode: response?.statusCode,
      };

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(payload);
      } else {
        this.logger.warn(payload);
      }
    } catch {
      // ignore logging failure
    }

    response
      .status(status)
      .send({
        error: {
          code: this.getErrorCode(exception, status),
          message,
          details: this.buildDetails(exceptionResponse, messageKey),
          request_id: request?.id ?? null,
        },
      })
      .raw?.uncork();
  }

  private getErrorCode(exception: HttpException | Error, status: HttpStatus): string {
    const name = exception?.constructor?.name ?? '';

    const nameMap: Record<string, string> = {
      NotFoundException: 'NOT_FOUND',
      UnauthorizedException: 'UNAUTHORIZED',
      ForbiddenException: 'FORBIDDEN',
      BadRequestException: 'BAD_REQUEST',
      ConflictException: 'CONFLICT',
      ThrottlerException: 'TOO_MANY_REQUESTS',
      UnprocessableEntityException: 'UNPROCESSABLE_ENTITY',
      InternalServerErrorException: 'INTERNAL_SERVER_ERROR',
      ServiceUnavailableException: 'SERVICE_UNAVAILABLE',
    };

    if (nameMap[name]) return nameMap[name];

    const statusMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
    };

    return statusMap[status] ?? 'INTERNAL_SERVER_ERROR';
  }

  private buildDetails(exceptionResponse: unknown, messageKey?: string): Record<string, unknown> {
    const details: Record<string, unknown> = {};

    if (messageKey) details.messageKey = messageKey;

    if (typeof exceptionResponse !== 'object' || exceptionResponse === null) return details;

    const res = exceptionResponse as Record<string, unknown>;

    // Validation errors — message is an array of field error strings
    if (Array.isArray(res.message) && res.message.length > 0) {
      details.errors = res.message;
    }

    // Brute-force / lockout extras
    if (typeof res.requiresCaptcha === 'boolean') details.requiresCaptcha = res.requiresCaptcha;
    if (typeof res.lockedUntil === 'string') details.lockedUntil = res.lockedUntil;

    return details;
  }

  private normalizeFrameworkMessage(message: unknown, status: HttpStatus): unknown {
    if (Array.isArray(message)) {
      return message.map((item) => this.normalizeFrameworkMessage(item, status));
    }

    if (typeof message !== 'string') return message;

    if (message === 'Unauthorized') return 'common.auth.unauthorized';
    if (message === 'Forbidden resource') return 'common.auth.forbidden';
    if (message === 'Bad Request') return 'common.request.bad';
    if (message === 'Internal server error') return 'common.server.internal';

    if (status === HttpStatus.NOT_FOUND && /^Cannot\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+/i.test(message)) {
      return 'common.route.notFound';
    }

    return message;
  }

  /**
   * Detects pg/Drizzle database errors and maps them to safe HTTP responses.
   *
   * Drizzle ORM wraps pg errors as: "Failed query: {full_sql}\nparams: {values}"
   * — this leaks schema structure AND parameter values (user data).
   * We must intercept ALL such errors before they reach the client.
   *
   * The full error (with SQL) is still written to logs for Zabbix/debugging.
   */
  private parseDatabaseError(exception: unknown): { status: HttpStatus; safeMessage: string } | null {
    if (!(exception instanceof Error)) return null;

    // Drizzle ORM error: message always starts with "Failed query:"
    // This is the primary detection — catches all Drizzle-wrapped pg errors.
    if (exception.message.startsWith('Failed query:')) {
      // Try to extract pg error code from .cause for specific HTTP semantics
      const pgCode = (exception as unknown as { cause?: { code?: unknown } }).cause?.code;
      if (typeof pgCode === 'string') {
        return this.mapPgCode(pgCode);
      }
      // Unknown Drizzle error — safe fallback
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, safeMessage: 'common.server.internal' };
    }

    // Raw pg.DatabaseError (no Drizzle wrapper) — code is on the exception itself
    const rawCode = (exception as unknown as { code?: unknown }).code;
    if (typeof rawCode === 'string' && /^[0-9A-Z]{5}$/.test(rawCode)) {
      return this.mapPgCode(rawCode);
    }

    return null;
  }

  private mapPgCode(code: string): { status: HttpStatus; safeMessage: string } {
    // Class 23 — Integrity Constraint Violation
    if (code === '23505') return { status: HttpStatus.CONFLICT, safeMessage: 'common.db.uniqueViolation' };
    if (code === '23503') return { status: HttpStatus.BAD_REQUEST, safeMessage: 'common.db.foreignKeyViolation' };
    if (code === '23502') return { status: HttpStatus.BAD_REQUEST, safeMessage: 'common.db.notNullViolation' };
    if (code.startsWith('23')) return { status: HttpStatus.BAD_REQUEST, safeMessage: 'common.db.constraintViolation' };
    // Class 22 — Data Exception
    if (code.startsWith('22')) return { status: HttpStatus.BAD_REQUEST, safeMessage: 'common.db.dataError' };
    // Class 08 — Connection Exception
    if (code.startsWith('08'))
      return { status: HttpStatus.SERVICE_UNAVAILABLE, safeMessage: 'common.server.unavailable' };
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, safeMessage: 'common.server.internal' };
  }
}
