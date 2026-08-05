import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '../../domain/enums/user-role.enum';

/**
 * Allows a request through only if the authenticated caller is either
 * requesting their own resource (route param `:userId` matches the
 * JWT subject) or holds an administrative role. Applied on top of the
 * platform-wide `JwtAuthGuard` (see /gateway/guards).
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  private static readonly ADMIN_ROLES = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requestedUserId = request.params?.userId;
    const caller = request.user;

    if (!caller) {
      throw new ForbiddenException('Authentication required');
    }

    const isSelf = caller.sub === requestedUserId;
    const isAdmin = SelfOrAdminGuard.ADMIN_ROLES.includes(caller.role);

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You may only access your own resource');
    }

    return true;
  }
}
