import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import {
  AUTH_GRPC_CLIENT,
  AUTH_SERVICE_NAME,
  AuthServiceGrpcClient,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshTokensRequest,
  ResetPasswordRequest,
} from '@libs/contracts/auth';
import { AuthGatewayPort } from '../../domain/services/auth-gateway.port';

/**
 * The only class in apps/backend that touches ClientGrpc — everything else depends on the
 * abstract AuthGatewayPort. Mirrors UserRepository -> UserRepositoryDrizzle.
 */
@Injectable()
export class AuthGrpcGatewayAdapter extends AuthGatewayPort implements OnModuleInit {
  private authService!: AuthServiceGrpcClient;

  constructor(@Inject(AUTH_GRPC_CLIENT) private readonly client: ClientGrpc) {
    super();
  }

  onModuleInit(): void {
    this.authService = this.client.getService<AuthServiceGrpcClient>(AUTH_SERVICE_NAME);
  }

  login(request: LoginRequest) {
    return firstValueFrom(this.authService.login(request));
  }

  refreshTokens(request: RefreshTokensRequest) {
    return firstValueFrom(this.authService.refreshTokens(request));
  }

  logout(request: LogoutRequest) {
    return firstValueFrom(this.authService.logout(request));
  }

  forgotPassword(request: ForgotPasswordRequest) {
    return firstValueFrom(this.authService.forgotPassword(request));
  }

  resetPassword(request: ResetPasswordRequest) {
    return firstValueFrom(this.authService.resetPassword(request));
  }

  changePassword(request: ChangePasswordRequest) {
    return firstValueFrom(this.authService.changePassword(request));
  }
}
