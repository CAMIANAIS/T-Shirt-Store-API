import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { PolicyHandler, CHECK_POLICIES_KEY } from './policies.decorator';
import { JwtUser } from './casl-ability.factory';
import type { Request } from 'express';
interface RequestWithUser extends Request {
  user: JwtUser;
}
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const policyHandlers = this.reflector.get<PolicyHandler[]>(
      CHECK_POLICIES_KEY,
      context.getHandler(),
    );

    // Fail closed: PoliciesGuard applied with no @CheckPolicies at all is a
    // wiring mistake, not "no restrictions" -- never default-allow here.
    if (!policyHandlers || policyHandlers.length === 0) {
      throw new Error(
        `PoliciesGuard is active on ${context.getClass().name}.${context.getHandler().name} but no @CheckPolicies() was found`,
      );
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new UnauthorizedException();
    }
    const ability = this.caslAbilityFactory.createForUser(user);

    return policyHandlers.every((handler) =>
      this.execPolicyHandler(handler, ability),
    );
  }

  private execPolicyHandler(handler: PolicyHandler, ability: AppAbility) {
    if (typeof handler === 'function') {
      return handler(ability);
    }
    return handler.handle(ability);
  }
}
