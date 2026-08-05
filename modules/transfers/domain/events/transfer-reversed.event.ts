import { DomainEvent } from '../../../../shared/events/domain-event.base';

/**
 * Published when a compensating credit is applied to the source
 * account after an external payout failed post-debit (saga
 * compensation) — distinct from `TransferFailedEvent` so downstream
 * consumers (e.g. Notifications) can tell "failed, and here is your
 * money back" from a plain failure.
 */
export class TransferReversedEvent extends DomainEvent {
  readonly eventName = 'transfers.transfer.reversed';

  constructor(
    readonly aggregateId: string,
    readonly reference: string,
  ) {
    super();
  }
}
