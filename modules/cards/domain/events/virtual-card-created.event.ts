import { DomainEvent } from '../../../../shared/events/domain-event.base';

export class VirtualCardCreatedEvent extends DomainEvent {
  readonly eventName = 'cards.card.virtual-created';

  constructor(
    readonly aggregateId: string,
    readonly userId: string,
    readonly accountId: string,
  ) {
    super();
  }
}
