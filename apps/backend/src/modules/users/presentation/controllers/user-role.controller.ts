import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { IdType } from '@/interfaces/id.type';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { PoliciesGuard } from '@/guards/policies.guard';
import { Policy } from '@/decorators/policy.decorator';
import { UserRoleDto, UserRolesDto, CreateUserRoleBody, UpdateUserRoleBody } from '../dtos';
import { UserRoleCreateCommand, UserRoleUpdateCommand, UserRoleDeleteCommand } from '../../application/commands';
import { UserRolesGetQuery, UserRoleGetByIdQuery } from '../../application/queries';

@ApiTags('user-roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('user-roles')
export class UserRoleController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @Policy(Actions.READ, Subjects.USER_ROLE)
  @ApiOperation({ summary: 'Get all roles' })
  @ApiOkResponse({ type: UserRolesDto })
  async userRoles(): Promise<UserRolesDto> {
    return this.queryBus.execute(new UserRolesGetQuery());
  }

  @Get(':id')
  @Policy(Actions.READ, Subjects.USER_ROLE)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiOkResponse({ type: UserRoleDto })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  async userRoleGetById(@Param('id', ParseUUIDPipe) id: IdType): Promise<UserRoleDto> {
    return this.queryBus.execute(new UserRoleGetByIdQuery(id));
  }

  @Post()
  @Policy(Actions.CREATE, Subjects.USER_ROLE)
  @ApiOperation({ summary: 'Create role' })
  @ApiCreatedResponse({ type: UserRoleDto })
  @ApiBadRequestResponse({ description: 'Validation error or role name already exists.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userRoleCreate(@Body() input: CreateUserRoleBody): Promise<UserRoleDto> {
    return this.commandBus.execute(new UserRoleCreateCommand(input));
  }

  @Patch(':id')
  @Policy(Actions.UPDATE, Subjects.USER_ROLE)
  @ApiOperation({ summary: 'Update role' })
  @ApiOkResponse({ type: UserRoleDto })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userRoleUpdate(
    @Param('id', ParseUUIDPipe) id: IdType,
    @Body() input: UpdateUserRoleBody,
  ): Promise<UserRoleDto> {
    return this.commandBus.execute(new UserRoleUpdateCommand(id, input));
  }

  @Delete(':id')
  @Policy(Actions.DELETE, Subjects.USER_ROLE)
  @ApiOperation({ summary: 'Delete role' })
  @ApiOkResponse({ schema: { properties: { success: { type: 'boolean' } } } })
  @ApiNotFoundResponse({ description: 'Role not found.' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions.' })
  async userRoleDelete(@Param('id', ParseUUIDPipe) id: IdType): Promise<{ success: boolean }> {
    const result = await this.commandBus.execute<string>(new UserRoleDeleteCommand(id));
    return { success: result === 'OK' };
  }
}
