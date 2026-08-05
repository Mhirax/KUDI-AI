export class InitiateExternalTransferCommand {
  constructor(
    readonly initiatorUserId: string,
    readonly sourceAccountId: string,
    readonly bankCode: string,
    readonly recipientAccountNumber: string,
    readonly recipientAccountName: string,
    readonly amount: string,
    readonly narration: string,
  ) {}
}
