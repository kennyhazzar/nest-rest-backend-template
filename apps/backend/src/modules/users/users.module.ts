import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';

import { AUTH_GRPC_CLIENT, AUTH_PACKAGE_NAME, resolveAuthProtoPath } from '@libs/contracts/auth';
import { CaslAbilityFactory } from '../../factories/casl-ability.factory';
import {
  UserRepository,
  RolePermissionRepository,
  UserRoleRepository,
  MagicLinkTokenRepository,
} from './domain/repositories';
import { PasswordResetTokenRepository } from './domain/repositories/password-reset-token.repository';
import { PasswordService } from '@libs/auth/password.service';
import { AuthGatewayPort } from './domain/services/auth-gateway.port';
import {
  UserRepositoryDrizzle,
  UserRoleRepositoryDrizzle,
  RolePermissionRepositoryDrizzle,
  MagicLinkTokenRepositoryDrizzle,
} from './infrastructure/repositories/drizzle';
import { PasswordResetTokenRepositoryDrizzle } from './infrastructure/repositories/drizzle/password-reset-token-repository.drizzle';
import { AuthController, UserController, UserRoleController } from './presentation/controllers';
import { AuthGrpcGatewayAdapter } from './infrastructure/adapters/auth-grpc-gateway.adapter';
import { PasswordServiceAdapter } from '@libs/auth/password-service.adapter';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthTokenVersionService, PoliciesService } from './infrastructure/services';
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
    CqrsModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_GRPC_CLIENT,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE_NAME,
            protoPath: resolveAuthProtoPath(),
            url: configService.getOrThrow<string>('grpc.authService.url'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [
    JwtStrategy,
    CaslAbilityFactory,
    PoliciesService,
    AuthTokenVersionService,
    ...CommandHandlers,
    ...QueryHandlers,
    { provide: UserRepository, useClass: UserRepositoryDrizzle },
    { provide: UserRoleRepository, useClass: UserRoleRepositoryDrizzle },
    { provide: RolePermissionRepository, useClass: RolePermissionRepositoryDrizzle },
    { provide: MagicLinkTokenRepository, useClass: MagicLinkTokenRepositoryDrizzle },
    { provide: PasswordResetTokenRepository, useClass: PasswordResetTokenRepositoryDrizzle },
    { provide: PasswordService, useClass: PasswordServiceAdapter },
    { provide: AuthGatewayPort, useClass: AuthGrpcGatewayAdapter },
  ],
  exports: [
    UserRepository,
    PasswordService,
    PoliciesService,
    AuthTokenVersionService,
    CaslAbilityFactory,
    UserRoleRepository,
    RolePermissionRepository,
  ],
})
export class UsersModule {}
