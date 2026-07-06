import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

import { loadConfiguration } from '@libs/common/configuration';
import { AUTH_PACKAGE_NAME, resolveAuthProtoPath } from '@libs/contracts/auth';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('AuthServiceBootstrap');
  const config = loadConfiguration() as { grpc?: { authService?: { port?: number } } };
  const host = '0.0.0.0';
  const port = config.grpc?.authService?.port ?? 50051;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE_NAME,
      protoPath: resolveAuthProtoPath(),
      url: `${host}:${port}`,
    },
  });

  await app.listen();
  logger.log(`Auth-service gRPC listening on ${host}:${port}`);
}
bootstrap();
