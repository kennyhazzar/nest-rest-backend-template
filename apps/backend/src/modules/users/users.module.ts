import { Algorithm } from 'jsonwebtoken';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { CaslAbilityFactory } from '../../factories/casl-ability.factory';
import {
  UserRepository,
  RolePermissionRepository,
  UserRoleRepository,
  MagicLinkTokenRepository,
} from './domain/repositories';
import { PasswordResetTokenRepository } from './domain/repositories/password-reset-token.repository';
import { PasswordService } from './domain/services/password.service';
import {
  UserRepositoryDrizzle,
  UserRoleRepositoryDrizzle,
  RolePermissionRepositoryDrizzle,
  MagicLinkTokenRepositoryDrizzle,
} from './infrastructure/repositories/drizzle';
import { PasswordResetTokenRepositoryDrizzle } from './infrastructure/repositories/drizzle/password-reset-token-repository.drizzle';
import { AuthController, UserController, UserRoleController } from './presentation/controllers';
import { AuthServiceAdapter } from './infrastructure/adapters/auth-service.adapter';
import { PasswordServiceAdapter } from './infrastructure/adapters/password-service.adapter';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { PoliciesService } from './infrastructure/services/policies.service';
import {
  LoginUserHandler,
  UserLogoutHandler,
  RefreshTokensHandler,
  UserCreateHandler,
  UserUpdateHandler,
  UserDeleteHandler,
  UserUpdateThemeHandler,
  UserGetHandler,
  UserGetByIdHandler,
  UserGetByEmailHandler,
  UsersGetHandler,
  UserRoleCreateHandler,
  UserRoleUpdateHandler,
  UserRoleDeleteHandler,
  UserRoleGetByIdHandler,
  UserRolesGetHandler,
  MagicLinkRequestHandler,
  MagicLinkAuthenticateHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  UserUnlockHandler,
  AdminResetPasswordHandler,
  UserUpdateNotificationChannelsHandler,
} from './application/handlers';

const CommandHandlers = [
  LoginUserHandler,
  UserLogoutHandler,
  RefreshTokensHandler,
  UserCreateHandler,
  UserUpdateHandler,
  UserDeleteHandler,
  UserUpdateThemeHandler,
  UserRoleCreateHandler,
  UserRoleUpdateHandler,
  UserRoleDeleteHandler,
  MagicLinkRequestHandler,
  MagicLinkAuthenticateHandler,
  ForgotPasswordHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  UserUnlockHandler,
  AdminResetPasswordHandler,
  UserUpdateNotificationChannelsHandler,
];

const QueryHandlers = [
  UserGetHandler,
  UserGetByIdHandler,
  UserGetByEmailHandler,
  UsersGetHandler,
  UserRoleGetByIdHandler,
  UserRolesGetHandler,
];

@Module({
  controllers: [AuthController, UserController, UserRoleController],
  imports: [
    PassportModule,
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
    CqrsModule,
  ],
  providers: [
    JwtStrategy,
    CaslAbilityFactory,
    PoliciesService,
    AuthServiceAdapter,
    ...CommandHandlers,
    ...QueryHandlers,
    { provide: UserRepository, useClass: UserRepositoryDrizzle },
    { provide: UserRoleRepository, useClass: UserRoleRepositoryDrizzle },
    { provide: RolePermissionRepository, useClass: RolePermissionRepositoryDrizzle },
    { provide: MagicLinkTokenRepository, useClass: MagicLinkTokenRepositoryDrizzle },
    { provide: PasswordResetTokenRepository, useClass: PasswordResetTokenRepositoryDrizzle },
    { provide: PasswordService, useClass: PasswordServiceAdapter },
  ],
  exports: [
    UserRepository,
    AuthServiceAdapter,
    PasswordService,
    PoliciesService,
    CaslAbilityFactory,
    UserRoleRepository,
    RolePermissionRepository,
  ],
})
export class UsersModule {}
