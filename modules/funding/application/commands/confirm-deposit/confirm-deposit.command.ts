/**
 * Dispatched exclusively by the Flutterwave funding webhook controller
 * when a `charge.completed` event arrives. `providerTransactionId` is
 * always re-verified server-to-server before any money moves — webhook
 * payload contents are treated as untrusted hints.
 */
export class ConfirmDepositCommand {
  constructor(readonly providerTransactionId: string) {}
}
