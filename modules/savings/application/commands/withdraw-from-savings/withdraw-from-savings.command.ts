export class WithdrawFromSavingsCommand {
  constructor(
    readonly userId: string,
    readonly savingsGoalId: string,
    /** Major-unit decimal string. */
    readonly amount: string,
  ) {}
}
