import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCookieAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Throttle } from '@nestjs/throttler';

import { AuthMode } from '@/enums';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { CurrentUserId } from '@/decorators/current-user-id.decorator';
import { AuthServiceAdapter } from '../../infrastructure/adapters';
import {
  AuthResponseDto,
  AccessTokenResponseDto,
  LogoutResponseDto,
  LoginBody,
  RefreshTokenBody,
  ForgotPasswordBody,
  ResetPasswordBody,
  ChangePasswordBody,
  SuccessResponseDto,
  UserDto,
} from '../dtos';
import { UserGetByIdQuery } from '../../application/queries';
import { UserMapper } from '../mappers';
import {
  UserLoginCommand,
  UserLogoutCommand,
  RefreshTokensCommand,
  ForgotPasswordCommand,
  ResetPasswordCommand,
  ChangePasswordCommand,
} from '../../application/commands';

import type { IdType } from '@/interfaces/id.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly authService: AuthServiceAdapter,
    private readonly configService: ConfigService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated.' })
  me(@CurrentUserId() userId: IdType): Promise<UserDto> {
    return this.queryBus.execute(new UserGetByIdQuery(userId));
  }

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Authenticated successfully. Tokens may also be set as httpOnly cookies depending on auth mode.',
  })
  @ApiBadRequestResponse({ description: 'Validation error in request body.' })
  @ApiUnauthorizedResponse({
    description:
      'Invalid credentials or account not verified. After repeated failures response may include requiresCaptcha=true.',
  })
  @ApiForbiddenResponse({ description: 'Account is temporarily locked or blocked.' })
  async login(
    @Body() input: LoginBody,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponseDto> {
    const user = await this.commandBus.execute(new UserLoginCommand(input));
    const accessToken = await this.authService.generateAccessToken({
      userId: user.id,
      roleId: user.roleId,
      roleType: user.role!.type,
      language: user.language,
    });
    const refreshToken = await this.authService.generateRefreshToken(user, req);
    const csrfToken = this.authService.generateCsrfToken();

    this.authService.setAuthCookies(reply, accessToken, refreshToken, csrfToken);

    const mode = this.configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);
    const csrfEnabled = this.configService.get<boolean>('auth.csrf.enabled', false);

    return {
      accessToken: mode !== AuthMode.COOKIES_ONLY ? accessToken : undefined,
      refreshToken: mode !== AuthMode.COOKIES_ONLY ? refreshToken : undefined,
      csrfToken: csrfEnabled && mode !== AuthMode.COOKIES_ONLY ? csrfToken : undefined,
      user: UserMapper.toDto(user),
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCookieAuth('refreshToken')
  @ApiOkResponse({ type: AccessTokenResponseDto, description: 'New token pair issued.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token missing, expired, or revoked.' })
  async refreshTokens(
    @Body() input: RefreshTokenBody,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AccessTokenResponseDto> {
    const refreshToken = req.cookies?.refreshToken || input?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('user.auth.logout.tokenNotProvided');
    }

    const tokens = await this.commandBus.execute(new RefreshTokensCommand(refreshToken, req));

    const mode = this.configService.get<AuthMode>('auth.mode', AuthMode.HYBRID);
    if (mode !== AuthMode.RESPONSE_ONLY) {
      this.authService.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken, tokens.csrfToken);
    }

    return {
      accessToken: mode !== AuthMode.COOKIES_ONLY ? tokens.accessToken : undefined,
      refreshToken: mode !== AuthMode.COOKIES_ONLY ? tokens.refreshToken : undefined,
      csrfToken: tokens.csrfToken,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiCookieAuth('refreshToken')
  @ApiOkResponse({ type: LogoutResponseDto })
  async logout(
    @Body() input: RefreshTokenBody,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<LogoutResponseDto> {
    const refreshToken = req.cookies?.refreshToken || input?.refreshToken;

    if (!refreshToken) {
      return { success: false, message: 'user.auth.logout.tokenNotProvided' };
    }

    const success = await this.commandBus.execute(new UserLogoutCommand(refreshToken));
    this.authService.clearAuthCookies(reply);

    return {
      success,
      message: success ? 'user.auth.logout.success' : 'user.auth.logout.failed',
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset link via email' })
  @ApiOkResponse({ type: SuccessResponseDto, description: 'Reset email sent if the account exists.' })
  @ApiBadRequestResponse({ description: 'Invalid email format.' })
  @Throttle({ default: { ttl: 900_000, limit: 3 } })
  async forgotPassword(@Body() input: ForgotPasswordBody): Promise<SuccessResponseDto> {
    return this.commandBus.execute(new ForgotPasswordCommand(input.email));
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Token expired, already used, or password too weak.' })
  async resetPassword(@Body() input: ResetPasswordBody): Promise<SuccessResponseDto> {
    return this.commandBus.execute(new ResetPasswordCommand(input.token, input.newPassword));
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password (requires current password)' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Current password incorrect or new password too weak.' })
  async changePassword(
    @CurrentUserId() userId: IdType,
    @Body() input: ChangePasswordBody,
  ): Promise<SuccessResponseDto> {
    return this.commandBus.execute(new ChangePasswordCommand(userId, input.currentPassword, input.newPassword));
  }
}
