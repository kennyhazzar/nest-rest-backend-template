import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentRoleId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.roleId ?? request.roleId;
  },
);
