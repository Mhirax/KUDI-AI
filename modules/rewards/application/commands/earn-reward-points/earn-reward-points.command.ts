/**
 * Internal command — never dispatched from an HTTP controller. Fired
 * by this module's own event handlers (see application/event-handlers/)
 * in reaction to TransferCompletedEvent / BillPaymentCompletedEvent /
 * DepositCompletedEvent from other bounded contexts.
 */
export class EarnRewardPointsCommand {
  constructor(
    readonly userId: string,
    readonly amountMinorUnits: bigint,
    readonly sourceReference: string,
    /** The originating event's own eventId — the idempotency key. */
    readonly sourceEventId: string,
    readonly description: string,
  ) {}
}
