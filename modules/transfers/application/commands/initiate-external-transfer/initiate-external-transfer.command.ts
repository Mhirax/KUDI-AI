export class InitiateExternalTransferCommand {
  constructor(
    readonly initiatorUserId: string,
    readonly sourceAccountId: string,
    readonly bankCode: string,
    readonly recipientAccountNumber: string,
    readonly recipientAccountName: string,
    readonly amount: string,
    readonly narration: string,
    /** From the x-idempotency-key header. Null/undefined = unprotected. */
    readonly idempotencyKey?: string,
  ) {}
}
