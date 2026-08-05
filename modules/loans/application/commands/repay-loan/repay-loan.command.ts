export class RepayLoanCommand {
  constructor(
    readonly userId: string,
    readonly loanId: string,
    /** Major-unit decimal string. */
    readonly amount: string,
  ) {}
}
