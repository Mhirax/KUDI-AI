/**
 * Distinct from GetUserByIdQuery to reflect a different read-model
 * concern (CQRS): "profile" is the shape a caller views their *own*
 * account through and may later diverge (e.g. include preferences),
 * whereas GetUserById serves admin/internal lookups.
 */
export class GetUserProfileQuery {
  constructor(readonly userId: string) {}
}
