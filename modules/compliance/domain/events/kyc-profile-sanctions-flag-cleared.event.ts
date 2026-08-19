import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class KycProfileSanctionsFlagClearedEvent extends DomainEvent {
  readonly eventName = 'compliance.kyc_profile.sanctions_flag_cleared';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly clearedByStaffUserId: string,
    readonly reason: string,
  ) {
    super();
  }
}
