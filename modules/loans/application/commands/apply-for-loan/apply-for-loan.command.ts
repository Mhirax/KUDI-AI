export class ApplyForLoanCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
    /** Major-unit decimal string. */
    readonly amount: string,
    readonly tenorDays: number,
  ) {}
}
