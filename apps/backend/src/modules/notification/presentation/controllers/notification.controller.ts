import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUserId } from '@/decorators/current-user-id.decorator';
import { Policy } from '@/decorators/policy.decorator';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { IdType } from '@/interfaces/id.type';
import { NotificationDeleteCommand } from '../../application/commands/notification-delete.command';
import { NotificationMarkAllReadCommand } from '../../application/commands/notification-mark-all-read.command';
import { NotificationMarkReadCommand } from '../../application/commands/notification-mark-read.command';
import { NotificationsGetQuery } from '../../application/queries/notifications-get.query';
import { NotificationUnreadCountQuery } from '../../application/queries/notification-unread-count.query';
import { NotificationsQuery } from '../dtos/notification.input';
import { NotificationsDto } from '../dtos/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class NotificationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @Policy(Actions.READ, Subjects.NOTIFICATION)
  @ApiOperation({ summary: 'List notifications for current user' })
  @ApiOkResponse({ type: NotificationsDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  list(@CurrentUserId() userId: IdType, @Query() filter: NotificationsQuery): Promise<NotificationsDto> {
    return this.queryBus.execute(
      new NotificationsGetQuery(userId, { isRead: filter.isRead, page: filter.page, per_page: filter.per_page }),
    );
  }

  @Get('unread-count')
  @Policy(Actions.READ, Subjects.NOTIFICATION)
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiOkResponse({
    schema: { properties: { count: { type: 'number', description: 'Number of unread notifications' } } },
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async unreadCount(@CurrentUserId() userId: IdType): Promise<{ count: number }> {
    const count: number = await this.queryBus.execute(new NotificationUnreadCountQuery(userId));
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(200)
  @Policy(Actions.UPDATE, Subjects.NOTIFICATION)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiOkResponse({ schema: { properties: { message: { type: 'boolean' } } } })
  @ApiNotFoundResponse({ description: 'Notification not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  markRead(@CurrentUserId() userId: IdType, @Param('id', ParseUUIDPipe) id: IdType): Promise<boolean> {
    return this.commandBus.execute(new NotificationMarkReadCommand(userId, id));
  }

  @Patch('read-all')
  @HttpCode(200)
  @Policy(Actions.UPDATE, Subjects.NOTIFICATION)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({
    schema: { properties: { count: { type: 'number', description: 'Number of notifications marked as read' } } },
  })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async markAllRead(@CurrentUserId() userId: IdType): Promise<{ count: number }> {
    const count: number = await this.commandBus.execute(new NotificationMarkAllReadCommand(userId));
    return { count };
  }

  @Delete(':id')
  @Policy(Actions.DELETE, Subjects.NOTIFICATION)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiOkResponse({ schema: { properties: { message: { type: 'boolean' } } } })
  @ApiNotFoundResponse({ description: 'Notification not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  delete(@CurrentUserId() userId: IdType, @Param('id', ParseUUIDPipe) id: IdType): Promise<boolean> {
    return this.commandBus.execute(new NotificationDeleteCommand(userId, id));
  }
}
