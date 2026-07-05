import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as enCommon from './en/common.json';
import * as enNotification from './en/notification.json';
import * as enUser from './en/user.json';
import * as enValidation from './en/validation.json';
import * as ruCommon from './ru/common.json';
import * as ruNotification from './ru/notification.json';
import * as ruUser from './ru/user.json';
import * as ruValidation from './ru/validation.json';
import { defaultLanguage } from './default-language';

type Locale = 'en' | 'ru';
type TranslationDictionary = Record<string, unknown>;
type TranslatableMessage = {
  message: string;
  args?: Record<string, unknown>;
};

const dictionaries: Record<Locale, TranslationDictionary> = {
  en: {
    ...enCommon,
    notification: enNotification,
    user: enUser,
    validation: enValidation,
  },
  ru: {
    ...ruCommon,
    notification: ruNotification,
    user: ruUser,
    validation: ruValidation,
  },
};

@Injectable()
export class I18nService {
  private readonly fallbackLanguage: Locale;

  constructor(private readonly configService: ConfigService) {
    this.fallbackLanguage = this.normalizeLanguage(
      this.configService.get<string>('settings.language', defaultLanguage),
    );
  }

  resolveLanguage(input?: string | string[] | null): Locale {
    const raw = Array.isArray(input) ? input[0] : input;
    if (!raw) return this.fallbackLanguage;

    const preferred = raw
      .split(',')
      .map((part) => part.trim().split(';')[0])
      .find(Boolean);

    return this.normalizeLanguage(preferred);
  }

  translate(value: unknown, language?: string | null, args?: Record<string, unknown>): unknown {
    if (typeof value === 'string') return this.translateString(value, language, args);
    if (Array.isArray(value)) return value.map((item) => this.translate(item, language, args));
    if (this.isTranslatableMessage(value)) {
      return this.translateString(value.message, language, value.args ?? args);
    }
    return value;
  }

  translateString(keyOrText: string, language?: string | null, args?: Record<string, unknown>): string {
    if (!this.isTranslationKey(keyOrText)) return keyOrText;

    const lang = this.resolveLanguage(language);
    const translated =
      this.lookup(dictionaries[lang], keyOrText) ?? this.lookup(dictionaries[this.fallbackLanguage], keyOrText);
    return typeof translated === 'string' ? this.interpolate(translated, args) : keyOrText;
  }

  isTranslationKey(value: string): boolean {
    return /^[a-z][a-z0-9_-]*(\.[a-zA-Z0-9_-]+)+$/.test(value);
  }

  private lookup(dictionary: TranslationDictionary, key: string): unknown {
    return key.split('.').reduce<unknown>((acc, segment) => {
      if (acc && typeof acc === 'object' && segment in acc) {
        return (acc as Record<string, unknown>)[segment];
      }
      return undefined;
    }, dictionary);
  }

  private normalizeLanguage(language?: string | null): Locale {
    const normalized = (language ?? '').trim().toLowerCase().replace('_', '-').split('-')[0];
    return normalized === 'en' ? 'en' : 'ru';
  }

  private isTranslatableMessage(value: unknown): value is TranslatableMessage {
    return Boolean(
      value &&
      typeof value === 'object' &&
      'message' in value &&
      typeof (value as { message?: unknown }).message === 'string',
    );
  }

  private interpolate(template: string, args?: Record<string, unknown>): string {
    if (!args) return template;
    return template.replace(/\{([a-zA-Z0-9_.-]+)\}/g, (match, key) => {
      const value = args[key];
      if (value === undefined || value === null) return match;
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint'
      ) {
        return String(value);
      }
      return JSON.stringify(value);
    });
  }
}
