import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import { DRIZZLE_CONNECTION } from '@/common/drizzle/drizzle.provider';
import * as schema from '@/common/drizzle/schema';
import { refresh as refreshTable } from '@/common/drizzle/schema';
import { AuthServiceAdapter } from '../../infrastructure/adapters';
import { UserRepository } from '../../domain/repositories/user.repository';
import { RefreshTokensCommand } from '../commands/refresh-tokens.command';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  private readonly logger = new Logger(RefreshTokensHandler.name);

  constructor(
    private readonly authService: AuthServiceAdapter,
    private readonly userRepository: UserRepository,
    @Inject(DRIZZLE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async execute(command: RefreshTokensCommand): Promise<{
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  }> {
    // Validate refresh token JWT
    const credentials = await this.authService.validateJwt(
      command.refreshToken,
      (this.authService as any).refreshToken, // Private field access
    );

    if (!credentials) {
      this.logger.warn('Refresh token rotation rejected: reason=invalid_jwt_payload');
      throw new UnauthorizedException('user.auth.invalidJwtPayload');
    }

    // Check if token exists in database and is not revoked
    const [tokenRecord] = await this.db
      .select()
      .from(refreshTable)
      .where(eq(refreshTable.refreshToken, command.refreshToken))
      .limit(1);

    if (!tokenRecord) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=token_not_found`);
      throw new UnauthorizedException('user.auth.tokenNotFound');
    }

    if (tokenRecord.isRevoked) {
      this.logger.warn(
        `Refresh token rotation rejected: userId=${credentials.userId} reason=revoked_token_reuse possibleTokenTheft=true`,
      );
      await this.db.update(refreshTable).set({ isRevoked: true }).where(eq(refreshTable.userId, credentials.userId));
      throw new ForbiddenException('user.auth.tokenRevoked');
    }

    // Check token expiration
    if (new Date() > tokenRecord.expiresAt) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=token_expired`);
      throw new UnauthorizedException('user.auth.tokenExpired');
    }

    // Fetch user from database
    const user = await this.userRepository.findById(credentials.userId, { includeRole: false });

    if (!user) {
      this.logger.error(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_not_found`);
      throw new UnauthorizedException('user.notFound');
    }

    // Verify user status
    if (!user.verified) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_not_verified`);
      throw new UnauthorizedException('user.auth.verified');
    }

    if (user.blocked) {
      this.logger.warn(`Refresh token rotation rejected: userId=${credentials.userId} reason=user_blocked`);
      throw new UnauthorizedException('user.auth.blocked');
    }

    // CRITICAL: Revoke old refresh token (rotation)
    await this.db.update(refreshTable).set({ isRevoked: true }).where(eq(refreshTable.id, tokenRecord.id));

    this.logger.log(`Refresh token revoked during rotation: userId=${user.id}`);

    // Generate NEW tokens (refresh token rotation)
    const accessToken = await this.authService.generateAccessToken(credentials);
    const refreshToken = await this.authService.generateRefreshToken(user, command.request);
    const csrfToken = this.authService.generateCsrfToken();

    this.logger.log(`Refresh token rotation succeeded: userId=${user.id} email=${user.email}`);

    return {
      accessToken,
      refreshToken,
      csrfToken,
    };
  }
}
