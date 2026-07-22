import { randomUUID } from 'node:crypto';
import { Algorithm } from 'jsonwebtoken';
import * as ms from 'ms';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { JWT_BASE_OPTIONS, JwtPayloadApp, ValidateJWT } from '@libs/auth/jwt-payload.interface';

@Injectable()
export class TokenIssuerService {
  private readonly logger = new Logger(TokenIssuerService.name);

  private readonly accessTokenExpires: ms.StringValue;
  private readonly refreshTokenExpires: ms.StringValue;
  private readonly refreshSecret: string;
  private readonly refreshJwtAlgorithm: Algorithm;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.accessTokenExpires = this.configService.getOrThrow<ms.StringValue>('jwt.access.expires');
    this.refreshTokenExpires = this.configService.getOrThrow<ms.StringValue>('jwt.refresh.expires');
    this.refreshSecret = this.configService.getOrThrow<string>('jwt.refresh.token');
    this.refreshJwtAlgorithm = this.configService.getOrThrow<Algorithm>('jwt.refresh.jwtAlgorithm');
  }

  async generateAccessToken({ userId, roleId, roleType, language, tokenVersion }: ValidateJWT): Promise<string> {
    if (!Number.isInteger(tokenVersion)) {
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    const opts: JwtSignOptions = {
      ...JWT_BASE_OPTIONS(userId),
      subject: String(userId),
      expiresIn: this.accessTokenExpires,
    };

    return this.jwtService.signAsync({ rid: roleId, rty: roleType, lng: language, tv: tokenVersion }, opts);
  }

  /**
   * Signs a refresh JWT. Does NOT persist it — the caller (handler) is responsible for
   * writing the `refresh` row via RefreshTokenRepository, since that's a domain/persistence
   * concern, not a token-signing one.
   */
  async generateRefreshToken({ userId, roleId, roleType, language, tokenVersion }: ValidateJWT): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    if (!Number.isInteger(tokenVersion)) {
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    const opts: JwtSignOptions = {
      ...JWT_BASE_OPTIONS(userId),
      secret: this.refreshSecret,
      algorithm: this.refreshJwtAlgorithm,
      jwtid: randomUUID(),
      subject: String(userId),
      expiresIn: this.refreshTokenExpires,
    };
    const token = await this.jwtService.signAsync({ rid: roleId, rty: roleType, lng: language, tv: tokenVersion }, opts);
    const expiresAt = new Date(Date.now() + ms(this.refreshTokenExpires ?? '7days'));

    return { token, expiresAt };
  }

  generateCsrfToken(): string {
    return randomUUID();
  }

  async validateRefreshToken(token: string): Promise<ValidateJWT | null> {
    try {
      const {
        sub: userId,
        rid: roleId,
        rty: roleType,
        lng: language,
        tv: tokenVersion,
      } = await this.jwtService.verifyAsync<JwtPayloadApp>(token, {
        secret: this.refreshSecret,
        algorithms: [this.refreshJwtAlgorithm],
      });

      if (!userId || !roleId || !roleType || !language) {
        return null;
      }

      return { userId, roleId, roleType, language, tokenVersion };
    } catch (error: unknown) {
      this.logger.debug(`Refresh token validation failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
