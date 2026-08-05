import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class VirtualAccountCreatedEvent extends DomainEvent {
  readonly eventName = 'funding.virtual-account.created';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountId: string,
    readonly virtualAccountNumber: string,
    readonly bankName: string,
  ) {
    super();
  }
}
