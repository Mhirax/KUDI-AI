import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class KycProfileCreatedEvent extends DomainEvent {
  readonly eventName = 'compliance.kyc_profile.created';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
  ) {
    super();
  }
}
