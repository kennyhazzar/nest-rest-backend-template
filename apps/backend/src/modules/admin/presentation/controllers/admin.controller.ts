import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { PaginatedResult } from '@/common/Paginated';
import { Policy } from '@/decorators/policy.decorator';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { SystemSettingUpdateCommand } from '../../application/commands/admin.commands';
import { AccessLogsQuery, DashboardQuery, SystemSettingsQuery } from '../../application/queries/admin.queries';
import {
  AccessLogDto,
  AccessLogsQuery as AccessLogsQueryDto,
  DashboardDto,
  SystemSettingDto,
  UpdateSystemSettingBody,
} from '../dtos/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AdminController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('dashboard')
  @Policy(Actions.READ, Subjects.ADMIN_DASHBOARD)
  @ApiOperation({ summary: 'Get system-wide dashboard statistics' })
  @ApiOkResponse({ type: DashboardDto })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  dashboard(): Promise<DashboardDto> {
    return this.queryBus.execute(new DashboardQuery());
  }

  @Get('access-logs')
  @Policy(Actions.READ, Subjects.ADMIN_ACCESS_LOG)
  @ApiOperation({ summary: 'Get paginated access audit log' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/AccessLogDto' } },
        meta: { $ref: '#/components/schemas/PaginatedMetaDto' },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  accessLogs(@Query() filter: AccessLogsQueryDto): Promise<PaginatedResult<AccessLogDto>> {
    return this.queryBus.execute(new AccessLogsQuery(filter));
  }

  @Get('system-settings')
  @Policy(Actions.READ, Subjects.ADMIN_SETTINGS)
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiOkResponse({ type: [SystemSettingDto] })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  getSettings(): Promise<SystemSettingDto[]> {
    return this.queryBus.execute(new SystemSettingsQuery());
  }

  @Patch('system-settings')
  @Policy(Actions.UPDATE, Subjects.ADMIN_SETTINGS)
  @ApiOperation({ summary: 'Create or update a system setting (upsert by key)' })
  @ApiOkResponse({ type: SystemSettingDto })
  @ApiBadRequestResponse({ description: 'Validation error in request body.' })
  @ApiForbiddenResponse({ description: 'Admin access required.' })
  updateSetting(@Body() input: UpdateSystemSettingBody): Promise<SystemSettingDto> {
    return this.commandBus.execute(new SystemSettingUpdateCommand(input.key, input.value));
  }
}
