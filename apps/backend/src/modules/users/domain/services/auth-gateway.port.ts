import {
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

/**
 * Port for the auth-service capability (credential verification, token issuance/rotation,
 * password reset/change). The only thing CQRS handlers in this module depend on for these
 * operations — never a raw gRPC client. Implemented by AuthGrpcGatewayAdapter, the sole
 * place in this module that knows about gRPC.
 */
export abstract class AuthGatewayPort {
  abstract login(request: LoginRequest): Promise<LoginResponse>;
  abstract refreshTokens(request: RefreshTokensRequest): Promise<RefreshTokensResponse>;
  abstract logout(request: LogoutRequest): Promise<LogoutResponse>;
  abstract forgotPassword(request: ForgotPasswordRequest): Promise<ForgotPasswordResponse>;
  abstract resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse>;
  abstract changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse>;
}
