import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declares which roles are permitted to access a route/handler.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
