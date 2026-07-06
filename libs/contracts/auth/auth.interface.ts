import type { Observable } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
  requestIp: string;
  userAgent: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  userId: string;
  email: string;
  failureReason: string;
  lockedUntil: string;
  requiresCaptcha: boolean;
}

export interface RefreshTokensRequest {
  refreshToken: string;
  requestIp: string;
  userAgent: string;
}

export interface RefreshTokensResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  failureReason: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  userId: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  userId: string;
  failureReason: string;
}

export interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  failureReason: string;
}

/**
 * Shape of the gRPC client stub as seen by apps/backend (via `ClientGrpc.getService<AuthServiceGrpcClient>`).
 * Every method returns an Observable, per @nestjs/microservices' gRPC client convention.
 */
export interface AuthServiceGrpcClient {
  login(request: LoginRequest): Observable<LoginResponse>;
  refreshTokens(request: RefreshTokensRequest): Observable<RefreshTokensResponse>;
  logout(request: LogoutRequest): Observable<LogoutResponse>;
  forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse>;
  resetPassword(request: ResetPasswordRequest): Observable<ResetPasswordResponse>;
  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse>;
}
