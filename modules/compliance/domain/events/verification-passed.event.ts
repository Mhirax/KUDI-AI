import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class VerificationPassedEvent extends DomainEvent {
  readonly eventName = 'compliance.verification.passed';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly verificationType: string,
  ) {
    super();
  }
}
