/**
 * Roles recognized across the Identity bounded context.
 * Consumed by the shared @Roles() decorator and RolesGuard
 * (see /gateway/guards/roles.guard.ts).
 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
