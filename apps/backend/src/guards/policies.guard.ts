import { FastifyRequest } from 'fastify';
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleType } from '@/enums/role-type.enum';
import { Actions } from '@/enums/actions.enum';
import { Subjects } from '@/enums/subjects.enum';
import { PoliciesService } from '@/modules/users/infrastructure/services/policies.service';
import { POLICY_KEY } from '../decorators/policy.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly logger = new Logger(PoliciesGuard.name);

  constructor(
    private reflector: Reflector,
    private policiesService: PoliciesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const policy = this.reflector.get<[Actions, Subjects[] | Subjects]>(POLICY_KEY, handler);
    if (!policy) {
      return true;
    }

    const req: FastifyRequest = context.switchToHttp().getRequest();
    const principal = (
      req as FastifyRequest & {
        user?: {
          userId?: string;
          roleId?: string;
          roleType?: RoleType;
          language?: string;
        };
      }
    ).user;
    const userId = principal?.userId ?? req.userId;
    const roleId = principal?.roleId ?? req.roleId;
    const roleType = principal?.roleType ?? req.roleType;
    const language = principal?.language ?? req.language;

    if (!userId || !roleId || !roleType || !language) {
      const [action, subject] = policy;
      return this.policiesService.hasPermission(RoleType.PUBLIC, action, subject);
    }

    const ability = await this.policiesService.getAbilityForRole(roleType);
    if (!ability) {
      this.logger.warn(`No ability found for role type: ${roleType}`);
      return false;
    }

    const [action, subject] = policy;
    let can: boolean;
    if (Array.isArray(subject)) {
      can = subject.some((s) => ability.can(action, s));
    } else {
      can = ability.can(action, subject);
    }

    if (!can) {
      this.logger.warn(
        `User ${userId} with role ${roleType} is not allowed to perform ${action} on ${JSON.stringify(subject)}`,
      );
    }

    return can;
  }
}
