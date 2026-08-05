export class InitiateCheckoutDepositCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    /** Major-unit decimal string. */
    readonly amount: string,
  ) {}
}
