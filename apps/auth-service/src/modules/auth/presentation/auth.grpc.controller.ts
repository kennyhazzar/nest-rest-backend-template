import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';

import {
  AUTH_SERVICE_NAME,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokensRequest,
  RefreshTokensResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@libs/contracts/auth';
import { ChangePasswordCommand } from '../application/commands/change-password.command';
import { ForgotPasswordCommand } from '../application/commands/forgot-password.command';
import { LoginCommand } from '../application/commands/login.command';
import { LogoutCommand } from '../application/commands/logout.command';
import { RefreshTokensCommand } from '../application/commands/refresh-tokens.command';
import { ResetPasswordCommand } from '../application/commands/reset-password.command';

/**
 * gRPC boundary: converts proto messages to CQRS commands and back. Contains no business
 * logic itself — that lives entirely in the command handlers, same as apps/backend's
 * HTTP controllers.
 */
@Controller()
export class AuthGrpcController {
  constructor(private readonly commandBus: CommandBus) {}

  @GrpcMethod(AUTH_SERVICE_NAME, 'Login')
  login(data: LoginRequest): Promise<LoginResponse> {
    return this.commandBus.execute(new LoginCommand(data.email, data.password, data.requestIp, data.userAgent));
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'RefreshTokens')
  refreshTokens(data: RefreshTokensRequest): Promise<RefreshTokensResponse> {
    return this.commandBus.execute(new RefreshTokensCommand(data.refreshToken, data.requestIp, data.userAgent));
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Logout')
  logout(data: LogoutRequest): Promise<LogoutResponse> {
    return this.commandBus.execute(new LogoutCommand(data.refreshToken));
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ForgotPassword')
  forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.commandBus.execute(new ForgotPasswordCommand(data.email));
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ResetPassword')
  resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.commandBus.execute(new ResetPasswordCommand(data.token, data.newPassword));
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ChangePassword')
  changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    return this.commandBus.execute(
      new ChangePasswordCommand(data.userId, data.currentPassword, data.newPassword),
    );
  }
}
