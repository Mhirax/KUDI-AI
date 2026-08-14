import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class VerificationFailedEvent extends DomainEvent {
  readonly eventName = 'compliance.verification.failed';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly verificationType: string,
    readonly reason: string,
  ) {
    super();
  }
}
