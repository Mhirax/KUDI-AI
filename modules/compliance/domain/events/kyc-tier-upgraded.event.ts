import { DomainEvent } from '../../../../shared/events/domain-event.base';

/**
 * Consumed by the Accounts module (see
 * modules/accounts/application/event-handlers/kyc-tier-upgraded.handler.ts)
 * to activate a user's PENDING_VERIFICATION accounts once they reach
 * TIER_2. This is the module's public contract with the rest of the
 * platform — Accounts depends on this event class, never on anything
 * else inside Compliance.
 */
export class KycTierUpgradedEvent extends DomainEvent {
  readonly eventName = 'compliance.kyc_profile.tier_upgraded';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly newTier: string,
  ) {
    super();
  }
}
