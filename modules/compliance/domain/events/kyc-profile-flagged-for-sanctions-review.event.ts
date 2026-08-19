import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class KycProfileFlaggedForSanctionsReviewEvent extends DomainEvent {
  readonly eventName = 'compliance.kyc_profile.sanctions_flagged';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    /** Names/programs of the watchlist candidates that matched — for the audit record, not a verdict. */
    readonly matchSummary: string,
  ) {
    super();
  }
}
