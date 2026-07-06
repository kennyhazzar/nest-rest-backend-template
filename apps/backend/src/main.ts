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

/** Header a client may send to propagate its own request id. */
const REQUEST_ID_HEADER = 'x-request-id';
/** Header the server always sends back with the effective request id (client-supplied or generated). */
const REQUEST_ID_HEADER_RESPONSE = 'X-Request-Id';
/** Restricts accepted client-supplied request ids to a safe character set/length before they are ever logged or echoed back, so a client cannot inject arbitrary header content via this value. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Application entry point.
 *
 * Boots the Nest application on the Fastify adapter and wires up, in order:
 * request id propagation, cookie/multipart parsing, CORS, security headers (Helmet/CSP),
 * static file serving, the global API prefix, Swagger (optionally behind Basic Auth),
 * global validation/interceptors/exception handling, and finally starts the HTTP listener.
 *
 * Wrapped in an IIFE (rather than a named `bootstrap()`) since this file has no other export
 * consumers — it is only ever executed as the process entry point.
 */
void (async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // Trust X-Forwarded-* headers from the reverse proxy (needed for correct client IP/protocol
      // behind Docker/nginx/etc.).
      trustProxy: true,
      // Reuse an inbound x-request-id if the client already provided one (e.g. propagated from an
      // upstream gateway), otherwise mint a fresh UUID. Validated against REQUEST_ID_PATTERN first
      // so an attacker-controlled header can't smuggle unexpected content into logs/response headers.
      genReqId: (request) => {
        const requestId = request.headers[REQUEST_ID_HEADER];
        const candidate = Array.isArray(requestId) ? requestId[0] : requestId;
        return typeof candidate === 'string' && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();
      },
      requestTimeout: 300000,
      bodyLimit: 1024 * 1024 * 50,
    }),
    {
      // Pino (via nestjs-pino) handles buffering/flushing itself; disabling Nest's own log
      // buffering avoids startup log lines being held back and out of order.
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

  // Cookie plugin: `secret` enables Fastify's signed-cookie support, used for the CSRF cookie.
  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('jwt.access.token'),
  });
  // Multipart plugin: backs file-upload endpoints (see the `file` module).
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 50,
      files: 10,
      fields: 20,
      fieldSize: 1024 * 1024,
    },
  });

  // Echo the effective request id back on every response, so a client-reported issue can be
  // correlated with server-side logs even when the client didn't supply its own id.
  fastify.addHook('onRequest', async (request, reply) => {
    reply.header(REQUEST_ID_HEADER_RESPONSE, request.id);
  });

  // CORS origin allowlist: the configured host origin, plus the local Vite dev server outside
  // production so the frontend can be developed against this backend without extra config.
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

  // Content-Security-Policy directives for Helmet. Kept strict by default; relaxed only outside
  // production so Swagger UI and the local Vite dev server keep working during development.
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
  // Serves the local `upload/` directory at the site root (used for static assets such as favicons).
  await app.register(fastifyStatic, { root: pathJoin(process.cwd(), 'upload'), prefix: '/' });

  // All application routes are versioned under /api/v1, except internal routes (e.g. health
  // checks meant for orchestrators) which stay unprefixed and unversioned.
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

    // Swagger UI is otherwise unauthenticated; gate it behind HTTP Basic Auth when credentials
    // are configured (typically in production) so the API surface isn't publicly browsable.
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
            // Constant-time comparison so response timing can't be used to guess credentials
            // byte-by-byte. Length is checked first since timingSafeEqual requires equal-length
            // buffers; that check alone leaks only the length, not the content.
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

  // Global validation for all incoming DTOs: converts plain objects to typed class instances,
  // strips unknown properties, and routes validation failures through the i18n-aware exception
  // factory instead of raw class-validator messages.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: createValidationException,
    }),
  );
  // Order matters: language must be resolved before other interceptors run, since downstream
  // response shaping (TransformInterceptor) may need to translate message fields.
  app.useGlobalInterceptors(new LanguageInterceptor(i18nService), new LoggerInterceptor(), new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionFilter(httpServer, i18nService));

  await app.listen(port, hostname);
  logger.log(
    `Application is running on: "http://${hostname}:${port}/" on environment: "${environment}"`,
    NestApplication.name,
  );

  // Surface a visible startup warning when no external monitoring is wired up, so the absence
  // of alerting isn't silently discovered later during an incident.
  if (!configService.get<boolean>('observability.zabbix.enabled', false)) {
    logger.warn(
      'Zabbix monitoring is disabled. Backend will continue to run and write local service logs only.',
      NestApplication.name,
    );
  }
})();
