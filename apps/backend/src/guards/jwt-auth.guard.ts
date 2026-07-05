import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { IdType } from '@/interfaces/id.type';
import { RoleType } from '@/enums/role-type.enum';

declare module 'fastify' {
  export interface FastifyRequest {
    userId?: IdType | null;
    roleId?: IdType | null;
    roleType?: RoleType | null;
    language?: string | null;
    locale?: string | null;
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
