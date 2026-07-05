import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import * as supertest from 'supertest';
import { ConfigService } from '@nestjs/config';

// Must be set before AppModule import so the YAML loader picks up the test config
process.env.NODE_ENV = 'test';

import { AppModule } from '../../apps/backend/src/app.module';
import { AllExceptionFilter } from '../../apps/backend/src/exceptions';
import { LanguageInterceptor, LoggerInterceptor } from '../../apps/backend/src/interceptors';
import { I18nService } from '../../apps/backend/src/i18n';
import { createValidationException } from '../../apps/backend/src/i18n/validation-exception.factory';

export interface TestApp {
  app: NestFastifyApplication;
  request: supertest.SuperAgentTest;
  close: () => Promise<void>;
}

let cached: TestApp | null = null;

/**
 * Returns a singleton NestJS application for E2E tests.
 * Call once in beforeAll; the same instance is reused across all E2E suites.
 */
export async function getTestApp(): Promise<TestApp> {
  if (cached) return cached;

  const module: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ logger: false }));

  const configService = app.get(ConfigService);
  const i18nService = app.get(I18nService);
  const httpAdapter = app.getHttpAdapter();

  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('jwt.access.token'),
  });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'internal/v1/*path', method: RequestMethod.ALL }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: createValidationException,
    }),
  );

  app.useGlobalInterceptors(new LanguageInterceptor(i18nService), new LoggerInterceptor());
  app.useGlobalFilters(new AllExceptionFilter(httpAdapter, i18nService));

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  cached = {
    app,
    request: supertest.agent(app.getHttpServer()),
    close: async () => {
      await app.close();
      cached = null;
    },
  };

  return cached;
}
