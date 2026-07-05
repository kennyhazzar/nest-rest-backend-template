import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleType } from '@/enums/role-type.enum';

export const CurrentRoleType = createParamDecorator((_data: unknown, ctx: ExecutionContext): RoleType | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.roleType ?? request.roleType;
});
