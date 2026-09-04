import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';

/**
 * Role-based access control guard. Reads the roles declared via the
 * shared `@Roles(...)` decorator (checking both handler and class
 * level) and compares them against `request.user.role`, populated by
 * `JwtStrategy.validate()` (see modules/identity/presentation/strategies).
 * Routes with no `@Roles()` metadata are allowed through — this guard
 * only restricts, it never grants access on its own; pair it with
 * `JwtAuthGuard` (or the global default) for actual authentication.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const callerRole = request?.user?.role as string | undefined;

    if (!callerRole || !requiredRoles.includes(callerRole)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
