import { join as pathJoin } from 'node:path';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { NestApplication, NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet, { FastifyHelmetOptions } from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';

import { AppModule } from './app.module';
import { AllExceptionFilter } from './exceptions';
import { LanguageInterceptor, LoggerInterceptor, TransformInterceptor } from './interceptors';
import { I18nService } from './i18n';
import { createValidationException } from './i18n/validation-exception.factory';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_HEADER_RESPONSE = 'X-Request-Id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

void (async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      genReqId: (request) => {
        const requestId = request.headers[REQUEST_ID_HEADER];
        const candidate = Array.isArray(requestId) ? requestId[0] : requestId;
        return typeof candidate === 'string' && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
      },
      requestTimeout: 300000,
      bodyLimit: 1024 * 1024 * 50,
    }),
    {
      bufferLogs: false,
      autoFlushLogs: true,
    },
  );

  const httpServer = app.getHttpAdapter();
  const fastify = httpServer.getInstance();
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  const configService = app.get(ConfigService);
  const i18nService = app.get(I18nService);
  const environment = configService.getOrThrow('host.environment');

  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('jwt.access.token'),
  });
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 50,
      files: 10,
      fields: 20,
      fieldSize: 1024 * 1024,
    },
  });

  fastify.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER_RESPONSE, request.id);
  });

  const origin: string[] = [configService.getOrThrow('host.origin')];
  if (environment !== 'production') {
    origin.push('http://localhost:5173'); // Vite dev server
  }

  const corsEnabled = configService.get<boolean>('cors.enabled', true);
  if (corsEnabled) {
    app.enableCors({
      origin,
      credentials: configService.get<boolean>('cors.credentials', true),
      methods: configService.get<string[]>('cors.methods', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']),
      allowedHeaders: configService.get<string[]>('cors.allowedHeaders', [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'X-CSRF-Token',
        REQUEST_ID_HEADER_RESPONSE,
      ]),
      exposedHeaders: [REQUEST_ID_HEADER_RESPONSE],
    });
  }

  const defaultSrc: string[] = [`'self'`, ...origin];
  const styleSrc: string[] = [`'self'`, `'unsafe-inline'`];
  const fontSrc: string[] = [`'self'`, 'data:'];
  const imgSrc: string[] = [`'self'`, 'data:'];
  const scriptSrc: string[] = [`'self'`];
  const crossOriginResourcePolicy: FastifyHelmetOptions['crossOriginResourcePolicy'] = { policy: 'cross-origin' };

  if (environment !== 'production') {
    defaultSrc.push('http://localhost:5173');
    scriptSrc.push(`'unsafe-inline'`, `'unsafe-eval'`);
  }

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc, styleSrc, fontSrc, imgSrc, scriptSrc } },
    crossOriginResourcePolicy,
  });
  await app.register(fastifyStatic, { root: pathJoin(process.cwd(), 'upload'), prefix: '/' });

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'internal/v1/*path', method: RequestMethod.ALL }],
  });

  const swaggerEnabled = configService.get<boolean>('swagger.enabled', true);
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nest REST Backend Template')
      .setDescription(
        'Production-ready REST API template with NestJS, Drizzle ORM, CQRS, RBAC/CASL, i18n, Docker, and observability',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('accessToken')
      .addTag('auth', 'Authentication — login, logout, token refresh, magic links')
      .addTag('users', 'User accounts and roles management')
      .addTag('files', 'S3-compatible file storage')
      .addTag('mail', 'Email templates and delivery queue')
      .addTag('notifications', 'In-app notifications')
      .addTag('captcha', 'Captcha challenges and administration')
      .addTag('admin', 'Admin dashboard, access logs and system settings')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    const docsUser = configService.get<string>('swagger.user');
    const docsPass = configService.get<string>('swagger.password');

    if (docsUser && docsPass) {
      const expectedUser = Buffer.from(docsUser);
      const expectedPass = Buffer.from(docsPass);

      fastify.addHook('onRequest', async (request, reply) => {
        if (!request.url.startsWith('/api/docs')) return;

        const authHeader = request.headers['authorization'] ?? '';
        if (authHeader.startsWith('Basic ')) {
          const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
          const colonIdx = decoded.indexOf(':');
          if (colonIdx !== -1) {
            const givenUser = Buffer.from(decoded.slice(0, colonIdx));
            const givenPass = Buffer.from(decoded.slice(colonIdx + 1));
            if (
              givenUser.length === expectedUser.length &&
              givenPass.length === expectedPass.length &&
              timingSafeEqual(givenUser, expectedUser) &&
              timingSafeEqual(givenPass, expectedPass)
            ) {
              return;
            }
          }
        }

        reply
          .header('WWW-Authenticate', 'Basic realm="API Documentation", charset="UTF-8"')
          .code(401)
          .send('Unauthorized');
      });
    }
  }

  const port = configService.get<number>('host.port', 3000);
  const hostname = configService.get<string>('host.hostname', 'localhost');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: createValidationException,
    }),
  );
  app.useGlobalInterceptors(new LanguageInterceptor(i18nService), new LoggerInterceptor(), new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionFilter(httpServer, i18nService));

  await app.listen(port, hostname);
  logger.log(
    `Application is running on: "http://${hostname}:${port}/" on environment: "${environment}"`,
    NestApplication.name,
  );

  if (!configService.get<boolean>('observability.zabbix.enabled', false)) {
    logger.warn(
      'Zabbix monitoring is disabled. Backend will continue to run and write local service logs only.',
      NestApplication.name,
    );
  }
})();
