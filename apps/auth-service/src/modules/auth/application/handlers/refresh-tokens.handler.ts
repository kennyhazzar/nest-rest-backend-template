import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';

import { RefreshTokensFailureReason, RefreshTokensResponse } from '@libs/contracts/auth';
import { AuthUserRepository } from '../../domain/repositories/auth-user.repository';
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { TokenIssuerService } from '../../infrastructure/services/token-issuer.service';
import { RefreshTokensCommand } from '../commands/refresh-tokens.command';

const NO_TOKENS = { accessToken: '', refreshToken: '', csrfToken: '' };

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  private readonly logger = new Logger(RefreshTokensHandler.name);

  constructor(
    private readonly tokenIssuer: TokenIssuerService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: AuthUserRepository,
  ) {}

  async execute(command: RefreshTokensCommand): Promise<RefreshTokensResponse> {
    const credentials = await this.tokenIssuer.validateRefreshToken(command.refreshToken);
    if (!credentials) {
      this.logger.warn('Refresh token rotation rejected: reason=invalid_jwt_payload');
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.INVALID_JWT_PAYLOAD };
    }

    const tokenRecord = await this.refreshTokenRepository.findByToken(command.refreshToken);
    if (!tokenRecord) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=token_not_found`);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.TOKEN_NOT_FOUND };
    }

    if (tokenRecord.isRevoked) {
      this.logger.warn(
        `Refresh token rotation rejected: userId=${credentials.userId} reason=revoked_token_reuse possibleTokenTheft=true`,
      );
      await this.refreshTokenRepository.revokeAllForUser(credentials.userId);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.TOKEN_REVOKED };
    }

    if (new Date() > tokenRecord.expiresAt) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=token_expired`);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.TOKEN_EXPIRED };
    }

    const user = await this.userRepository.findById(credentials.userId);
    if (!user) {
      this.logger.error(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_not_found`);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.USER_NOT_FOUND };
    }

    if (!user.verified) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_not_verified`);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.NOT_VERIFIED };
    }

    if (user.blocked) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_blocked`);
      return { ...NO_TOKENS, success: false, failureReason: RefreshTokensFailureReason.BLOCKED };
    }

    // CRITICAL: Revoke old refresh token (rotation)
    await this.refreshTokenRepository.revokeById(tokenRecord.id);
    this.logger.log(`Refresh token revoked during rotation: userId=${user.id}`);

    const accessToken = await this.tokenIssuer.generateAccessToken({
      userId: user.id,
      roleId: user.roleId,
      roleType: user.roleType,
      language: user.language,
      tokenVersion: user.tokenVersion,
    });
    const { token: refreshToken, expiresAt } = await this.tokenIssuer.generateRefreshToken({
      userId: user.id,
      roleId: user.roleId,
      roleType: user.roleType,
      language: user.language,
      tokenVersion: user.tokenVersion,
    });
    await this.refreshTokenRepository.create({
      userId: user.id,
      refreshToken,
      expiresAt,
      fingerprint: command.requestIp || 'unknown',
      userAgent: command.userAgent || 'unknown',
    });
    const csrfToken = this.tokenIssuer.generateCsrfToken();

    this.logger.log(`Refresh token rotation succeeded: userId=${user.id} email=${user.email}`);

    return { success: true, accessToken, refreshToken, csrfToken, failureReason: '' };
  }
}
