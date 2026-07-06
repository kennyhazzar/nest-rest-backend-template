import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { Algorithm } from 'jsonwebtoken';

import { PasswordService } from '@libs/auth/password.service';
import { PasswordServiceAdapter } from '@libs/auth/password-service.adapter';
import { AuthUserRepository } from './domain/repositories/auth-user.repository';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from './domain/repositories/password-reset-token.repository';
import { AuthUserRepositoryDrizzle } from './infrastructure/repositories/drizzle/auth-user-repository.drizzle';
import { RefreshTokenRepositoryDrizzle } from './infrastructure/repositories/drizzle/refresh-token-repository.drizzle';
import { PasswordResetTokenRepositoryDrizzle } from './infrastructure/repositories/drizzle/password-reset-token-repository.drizzle';
import { TokenIssuerService } from './infrastructure/services/token-issuer.service';
import { MailProducerService } from './infrastructure/services/mail-producer.service';
import { AuthGrpcController } from './presentation/auth.grpc.controller';
import {
  LoginHandler,
  RefreshTokensHandler,
  LogoutHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
} from './application/handlers';

const CommandHandlers = [
  LoginHandler,
  RefreshTokensHandler,
  LogoutHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
];

@Module({
  imports: [
    CqrsModule,
    BullModule.registerQueue({ name: 'mail' }),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('jwt.access.token'),
        signOptions: {
          algorithm: configService.get<Algorithm>('jwt.access.jwtAlgorithm', 'HS256'),
          expiresIn: configService.get('jwt.access.expires'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthGrpcController],
  providers: [
    ...CommandHandlers,
    TokenIssuerService,
    MailProducerService,
    { provide: PasswordService, useClass: PasswordServiceAdapter },
    { provide: AuthUserRepository, useClass: AuthUserRepositoryDrizzle },
    { provide: RefreshTokenRepository, useClass: RefreshTokenRepositoryDrizzle },
    { provide: PasswordResetTokenRepository, useClass: PasswordResetTokenRepositoryDrizzle },
  ],
})
export class AuthModule {}
