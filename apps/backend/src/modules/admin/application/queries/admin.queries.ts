import { AccessLogsQuery as AccessLogsQueryDto } from '../../presentation/dtos/admin.dto';

export class DashboardQuery {}

export class AccessLogsQuery {
  constructor(public readonly filter: AccessLogsQueryDto) {}
}

export class SystemSettingsQuery {}
