import { join as pathJoin } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { ClientOptions as ElasticClientOptions } from '@elastic/elasticsearch';
import type { PrettyOptions } from 'pino-pretty';
import type pino from 'pino';
import type { LevelWithSilent } from 'pino';
import { Params as NestPinoParams } from 'nestjs-pino';
import type { GelfOptions } from '@/utils/pino-gelf.mts';

export const LoggerModuleOptions = async (configService: ConfigService): Promise<NestPinoParams> => {
  const targets: pino.TransportTargetOptions[] = [];
  const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers.proxy-authorization',
    'req.headers.set-cookie',
    'req.headers.x-csrf-token',
    'req.headers["authorization"]',
    'req.headers["cookie"]',
    'req.headers["proxy-authorization"]',
    'req.headers["set-cookie"]',
    'req.headers["x-csrf-token"]',
    'res.headers.set-cookie',
    'res.headers["set-cookie"]',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.refreshToken',
    'req.body.accessToken',
    'req.body.csrfToken',
    'req.body.token',
    'accessToken',
    'refreshToken',
    'csrfToken',
    '*.accessToken',
    '*.refreshToken',
    '*.csrfToken',
    'msg.accessToken',
    'msg.refreshToken',
    'msg.csrfToken',
  ];

  // Pretty-print
  const prettyPrint: pino.TransportTargetOptions<PrettyOptions> = {
    target: process.env.NODE_ENV === 'test' ? 'pino-pretty' : `${__dirname}/../utils/pino-pretty.cjs`,
    options: {
      colorize: configService.get<boolean>('log.colorize', true),
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      singleLine: true,
      ignore: 'pid,hostname',
    },
    level: configService.getOrThrow<LevelWithSilent>('log.level'),
  };
  targets.push(prettyPrint);

  const fileLogEnabled = configService.get<boolean>('log.file.enabled', false);
  const fileLogPath = configService.get<string>('log.file.path');
  if (fileLogEnabled && fileLogPath && process.env.NODE_ENV !== 'test') {
    targets.push({
      target: 'pino/file',
      options: {
        destination: fileLogPath,
        mkdir: true,
      },
      level: configService.getOrThrow<LevelWithSilent>('log.level'),
    });
  }

  // GELF transport for Graylog
  const graylogEnabled = configService.get<boolean>('graylog.enabled', true);
  const graylogHost = configService.get<string>('graylog.host');
  const graylogPort = configService.get<number>('graylog.port');
  if (graylogEnabled && graylogHost && graylogPort && process.env.NODE_ENV !== 'test') {
    const gelf: pino.TransportTargetOptions<GelfOptions> = {
      target: pathJoin(__dirname, '../utils/pino-gelf.mjs'),
      options: {
        host: graylogHost,
        port: graylogPort,
        destination: 1,
        protocol: configService.get<'udp' | 'tcp'>('graylog.protocol', 'udp'),
        facility: configService.get<string>('graylog.facility', 'backend'),
        hostname: configService.get<string>('host.hostname', process.env.HOSTNAME || 'localhost'),
        environment: configService.get<string>('host.environment', 'development'),
        compression: configService.get<boolean>('graylog.compression', true),
        maxChunkSize: configService.get<number>('graylog.maxChunkSize', 8192),
      },
      level: 'trace',
    };
    targets.push(gelf);
  }

  // Add support for pino-elasticsearch
  const kibanaHost = configService.get<string>('kibana.host');
  if (kibanaHost) {
    await import('pino-elasticsearch');
    const kibana: pino.TransportTargetOptions<ElasticClientOptions> = {
      target: 'pino-elasticsearch',
      options: {
        node: kibanaHost,
        compression: true,
      },
      level: 'trace',
    };
    targets.push(kibana);
  }

  return {
    pinoHttp: {
      level: 'trace',
      transport: { targets },
      autoLogging: false,
      redact: {
        paths: redactPaths,
        remove: true,
      },
    },
    assignResponse: true,
  };
};
