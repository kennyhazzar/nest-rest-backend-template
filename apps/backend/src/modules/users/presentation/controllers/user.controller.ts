import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import type { IdType } from '@/interfaces/id.type';
import { Actions } from '@/enums/actions.enum';
import { RoleType } from '@/enums/role-type.enum';
import { Subjects } from '@/enums/subjects.enum';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { CurrentUserId } from '@/decorators/current-user-id.decorator';
import { CurrentRoleType } from '@/decorators/current-role-type.decorator';
import { Policy } from '@/decorators/policy.decorator';
import {
  UserDto,
  UsersDto,
  CreateUserBody,
  UpdateUserBody,
  UpdateThemeBody,
  UsersQuery,
  SuccessResponseDto,
  NotificationPreferencesDto,
  UpdateNotificationPreferencesBody,
} from '../dtos';
import {
  UserCreateCommand,
  UserUpdateCommand,
  UserDeleteCommand,
  UserUpdateThemeCommand,
  UserUnlockCommand,
  AdminResetPasswordCommand,
  UserUpdateNotificationChannelsCommand,
} from '../../application/commands';
import { UsersGetQuery, UserGetByIdQuery } from '../../application/queries';

@ApiTags('users')
@Controller()
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('users')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.READ, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (admin)' })
  @ApiOkResponse({ type: UsersDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async users(@Query() query: UsersQuery): Promise<UsersDto> {
    return this.queryBus.execute(new UsersGetQuery(query));
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (own profile always allowed; others require admin/manager role)' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userGetById(
    @Param('id', ParseUUIDPipe) id: IdType,
    @CurrentUserId() currentUserId: IdType,
    @CurrentRoleType() roleType: RoleType,
  ): Promise<UserDto> {
    if (id !== currentUserId && roleType !== RoleType.ADMIN && roleType !== RoleType.MANAGER) {
      throw new ForbiddenException('common.auth.forbidden');
    }
    return this.queryBus.execute(new UserGetByIdQuery(id));
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.CREATE, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user (admin)' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiBadRequestResponse({ description: 'Validation error or email already in use.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userCreate(@Body() input: CreateUserBody): Promise<UserDto> {
    return this.commandBus.execute(new UserCreateCommand(input));
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.UPDATE, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user (admin)' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userUpdate(@Param('id', ParseUUIDPipe) id: IdType, @Body() input: UpdateUserBody): Promise<UserDto> {
    return this.commandBus.execute(new UserUpdateCommand(id, input));
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.DELETE, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (admin)' })
  @ApiOkResponse({ schema: { properties: { success: { type: 'boolean' } } } })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userDelete(@Param('id', ParseUUIDPipe) id: IdType): Promise<{ success: boolean }> {
    const result = await this.commandBus.execute<string>(new UserDeleteCommand(id));
    return { success: result === 'OK' };
  }

  @Patch('users/me/theme')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user theme preference' })
  @ApiOkResponse({ type: UserDto })
  async userUpdateTheme(@CurrentUserId() userId: IdType, @Body() input: UpdateThemeBody): Promise<UserDto> {
    return this.commandBus.execute(new UserUpdateThemeCommand(userId, input));
  }

  @Post('users/:id/unlock')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.UPDATE, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlock user account (admin)' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userUnlock(@Param('id', ParseUUIDPipe) id: IdType): Promise<SuccessResponseDto> {
    return this.commandBus.execute(new UserUnlockCommand(id));
  }

  @Post('users/:id/reset-password')
  @UseGuards(JwtAuthGuard, PoliciesGuard)
  @Policy(Actions.UPDATE, Subjects.USER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-initiated password reset — sends reset link to user email' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async adminResetPassword(@Param('id', ParseUUIDPipe) id: IdType): Promise<SuccessResponseDto> {
    return this.commandBus.execute(new AdminResetPasswordCommand(id));
  }

  @Get('users/me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user notification channel preferences' })
  @ApiOkResponse({ type: NotificationPreferencesDto })
  async getNotificationPreferences(@CurrentUserId() userId: IdType): Promise<NotificationPreferencesDto> {
    const user = await this.queryBus.execute<UserDto>(new UserGetByIdQuery(userId));
    return { channels: user.notificationChannels ?? [] };
  }

  @Put('users/me/notification-preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user notification channel preferences' })
  @ApiOkResponse({ type: NotificationPreferencesDto })
  async updateNotificationPreferences(
    @CurrentUserId() userId: IdType,
    @Body() input: UpdateNotificationPreferencesBody,
  ): Promise<NotificationPreferencesDto> {
    await this.commandBus.execute(new UserUpdateNotificationChannelsCommand(userId, input.channels));
    return { channels: input.channels };
  }
}
