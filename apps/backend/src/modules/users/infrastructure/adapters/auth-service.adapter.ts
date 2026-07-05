import { createHmac, randomUUID } from 'node:crypto';
import { Algorithm } from 'jsonwebtoken';
import * as ms from 'ms';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { refresh as refreshTable } from '@/common/drizzle/schema';
import { ValidateJWT, JWT_BASE_OPTIONS, JwtPayloadApp } from '@/interfaces/jwt.payload.interface';
import { AuthMode } from '@/enums';
import { IdType } from '@/interfaces/id.type';
import { UserRepository } from '@/modules/users/domain/repositories/user.repository';
import { User } from '@/modules/users/domain/entities/user.entity';

@Injectable()
export class AuthServiceAdapter {
  private readonly logger = new Logger(AuthServiceAdapter.name);
  private readonly pinoLogger = new PinoLogger({ pinoHttp: { level: 'debug' } });

  private accessTokenExpires: ms.StringValue;
  private refreshTokenExpires: ms.StringValue;
  private refreshToken = 'default_token';
  private refreshJwtAlgorithm: Algorithm = 'HS512';
  private static algorithm = 'sha256';
  private static accessToken = 'default_token';

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {
    this.accessTokenExpires = this.configService.getOrThrow<ms.StringValue>('jwt.access.expires');
    this.refreshTokenExpires = this.configService.getOrThrow<ms.StringValue>('jwt.refresh.expires');
    this.refreshToken = this.configService.getOrThrow<string>('jwt.refresh.token');
    this.refreshJwtAlgorithm = this.configService.getOrThrow<Algorithm>('jwt.refresh.jwtAlgorithm');
    AuthServiceAdapter.accessToken = this.configService.getOrThrow<string>('jwt.access.token');
    AuthServiceAdapter.algorithm = this.configService.getOrThrow<string>('jwt.algorithm');
  }

  async generateAccessToken({ userId, roleId, roleType, language }: ValidateJWT): Promise<string> {
    const opts: JwtSignOptions = {
      ...JWT_BASE_OPTIONS(userId),
      subject: String(userId),
      expiresIn: this.accessTokenExpires,
    };

    return this.jwtService.signAsync({ rid: roleId, rty: roleType, lng: language }, opts);
  }

  async generateRefreshToken({ id: userId, roleId, role, language }: User, request: FastifyRequest): Promise<string> {
    const opts: JwtSignOptions = {
      ...JWT_BASE_OPTIONS(userId),
      secret: this.refreshToken,
      algorithm: this.refreshJwtAlgorithm,
      jwtid: randomUUID(),
      subject: String(userId),
      expiresIn: this.refreshTokenExpires,
    };
    const refreshToken = await this.jwtService.signAsync({ rid: roleId, rty: role?.type, lng: language }, opts);

    const expiresAt = new Date(Date.now() + ms(this.refreshTokenExpires ?? '7days'));
    const fingerprint = (request.headers['x-real-ip'] as string) ?? request.ip;
    const userAgent = request.headers['user-agent'];
    void this.db
      .insert(refreshTable)
      .values({
        userId,
        isRevoked: false,
        fingerprint: fingerprint || 'unknown',
        userAgent: userAgent || 'unknown',
        refreshToken,
        expiresAt,
      })
      .catch((error) => {
        this.logger.error(error);
      });

    return refreshToken;
  }

  async generateAccessTokenFromRefreshToken(refreshToken: string): Promise<string> {
    const credentials = await this.validateJwt(refreshToken, this.refreshToken);
    if (!credentials) {
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    const user = await this.userRepository.findById(credentials.userId, { includeRole: false });
    if (!user) {
      this.logger.error(`User with ID ${credentials.userId} not found`);
      throw new UnauthorizedException('user.notFound');
    }
    if (!user.verified) {
      this.logger.warn(`User with ID ${credentials.userId} is not verified`);
      throw new UnauthorizedException('user.auth.verified');
    }
    if (user.blocked) {
      this.logger.warn(`User with ID ${credentials.userId} is blocked`);
      throw new UnauthorizedException('user.auth.blocked');
    }

    return this.generateAccessToken(credentials);
  }

  async validateJwt(token: string, key?: string, req?: any): Promise<ValidateJWT | null> {
    try {
      const secret = key || AuthServiceAdapter.accessToken;
      const {
        sub: userId,
        rid: roleId,
        rty: roleType,
        lng: language,
      } = await this.jwtService.verifyAsync<JwtPayloadApp>(token, {
        secret,
      });

      if (!userId || !roleId || !roleType || !language) {
        throw new UnauthorizedException('user.auth.invalidJwtPayload');
      }

      return { userId, roleId, roleType, language };
    } catch (error: unknown) {
      this.pinoLogger.trace({
        msg: `JWT validation failed: ${error instanceof Error ? error.message : (error as any)}`,
        error,
        req,
      });
      return null;
    }
  }

  /**
   * Revoke refresh token (logout)
   * Marks the refresh token as revoked in database
   */
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      // Verify token first
      const credentials = await this.validateJwt(refreshToken, this.refreshToken);
      if (!credentials) {
        this.logger.warn('Invalid refresh token provided for revocation');
        return false;
      }

      // Find token in database and mark as revoked
      const rows = await this.db
        .update(refreshTable)
        .set({ isRevoked: true })
        .where(and(eq(refreshTable.refreshToken, refreshToken), eq(refreshTable.isRevoked, false)))
        .returning({ id: refreshTable.id });

      if (rows.length > 0) {
        this.logger.log(`Refresh token revoked for user ${credentials.userId}`);
        return true;
      }

      this.logger.warn(`Refresh token not found or already revoked`);
      return false;
    } catch (error: unknown) {
      this.logger.error(`Failed to revoke refresh token: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  async revokeAllRefreshTokensForUser(userId: IdType): Promise<void> {
    await this.db.update(refreshTable).set({ isRevoked: true }).where(eq(refreshTable.userId, userId));
  }

  /**
   * Generate CSRF token
   */
  generateCsrfToken(): string {
    return randomUUID();
  }

  /**
   * Set authentication cookies
   */
  setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string, csrfToken: string): void {
    const mode = this.configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);

    if (mode === AuthMode.RESPONSE_ONLY) {
      return; // Don't set cookies
    }

    // Access token cookie
    const accessCookieConfig = {
      httpOnly: this.configService.get<boolean>('auth.cookies.accessToken.httpOnly', true),
      secure: this.configService.get<boolean>('auth.cookies.accessToken.secure', true),
      sameSite: this.configService.get<'strict' | 'lax' | 'none'>('auth.cookies.accessToken.sameSite', 'lax'),
      maxAge: this.configService.get<number>('auth.cookies.accessToken.maxAge', 900000),
    };

    reply.setCookie(
      this.configService.get<string>('auth.cookies.accessToken.name', 'accessToken'),
      accessToken,
      accessCookieConfig,
    );

    // Refresh token cookie
    const refreshCookieConfig = {
      httpOnly: this.configService.get<boolean>('auth.cookies.refreshToken.httpOnly', true),
      secure: this.configService.get<boolean>('auth.cookies.refreshToken.secure', true),
      sameSite: this.configService.get<'strict' | 'lax' | 'none'>('auth.cookies.refreshToken.sameSite', 'lax'),
      maxAge: this.configService.get<number>('auth.cookies.refreshToken.maxAge', 604800000),
    };

    reply.setCookie(
      this.configService.get<string>('auth.cookies.refreshToken.name', 'refreshToken'),
      refreshToken,
      refreshCookieConfig,
    );

    // CSRF token cookie (NOT httpOnly!)
    const csrfEnabled = this.configService.get<boolean>('auth.csrf.enabled', false);
    if (csrfEnabled) {
      const csrfCookieConfig = {
        httpOnly: false, // JS must read this for sending in header
        secure: this.configService.get<boolean>('auth.cookies.csrf.secure', true),
        sameSite: this.configService.get<'strict' | 'lax' | 'none'>('auth.cookies.csrf.sameSite', 'lax'),
        maxAge: this.configService.get<number>('auth.cookies.csrf.maxAge', 604800000),
      };

      reply.setCookie(
        this.configService.get<string>('auth.cookies.csrf.name', 'csrf-token'),
        csrfToken,
        csrfCookieConfig,
      );
    }
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(reply: FastifyReply): void {
    const cookieNames = [
      this.configService.get<string>('auth.cookies.accessToken.name', 'accessToken'),
      this.configService.get<string>('auth.cookies.refreshToken.name', 'refreshToken'),
      this.configService.get<string>('auth.cookies.csrf.name', 'csrf-token'),
    ];

    cookieNames.forEach((name) => {
      reply.clearCookie(name);
    });
  }

  /**
   * @deprecated Use PasswordService.verifyPassword() instead.
   * This method uses insecure HMAC-SHA256 and will be removed in future versions.
   * @see PasswordService
   */
  static validateCredentials(passwordToCheck: string, password: string): boolean {
    const hashedPassword = AuthServiceAdapter.hashPassword(password);
    return hashedPassword === passwordToCheck;
  }

  /**
   * @deprecated Use PasswordService.hashPassword() instead.
   * This method uses insecure HMAC-SHA256 and will be removed in future versions.
   * @see PasswordService
   */
  static hashPassword(password: string): string {
    const hmac = createHmac(AuthServiceAdapter.algorithm, AuthServiceAdapter.accessToken);
    hmac.update(password.normalize());
    return hmac.digest('hex');
  }
}
