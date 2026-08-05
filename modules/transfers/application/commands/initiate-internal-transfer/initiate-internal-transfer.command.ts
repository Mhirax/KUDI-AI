export class InitiateInternalTransferCommand {
  constructor(
    readonly initiatorUserId: string,
    readonly sourceAccountId: string,
    readonly destinationAccountId: string,
    readonly amount: string, // decimal major-unit string, e.g. "1500.00"
    readonly narration: string,
  ) {}
}
