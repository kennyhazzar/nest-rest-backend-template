import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { I18nService } from '@/i18n';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const requestedLanguage = this.getRequestedLanguage(req);
    req.language = this.i18n.resolveLanguage(req.language ?? requestedLanguage);
    req.locale = req.language === 'en' ? 'en_US' : 'ru_RU';

    return next.handle().pipe(
      map((data) => {
        return this.translateMessages(data, req.language);
      }),
    );
  }

  private translateMessages(value: unknown, language: string | null | undefined): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.translateMessages(item, language));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    if (!this.isPlainObject(value)) {
      return value;
    }

    const record = value;
    const translated: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(record)) {
      translated[key] =
        key === 'message' ? this.i18n.translate(nestedValue, language) : this.translateMessages(nestedValue, language);
    }

    if (
      typeof record.message === 'string' &&
      this.i18n.isTranslationKey(record.message) &&
      typeof record.messageKey !== 'string'
    ) {
      translated.messageKey = record.message;
    }

    return translated;
  }

  private isPlainObject(value: object): value is Record<string, unknown> {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  private getRequestedLanguage(req: FastifyRequest): string | undefined {
    const query = req.query as { lang?: string; language?: string } | undefined;
    return (
      req.headers['x-language']?.toString() ??
      req.headers['x-lang']?.toString() ??
      query?.language ??
      query?.lang ??
      req.headers['accept-language']?.toString()
    );
  }
}
