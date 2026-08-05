export class ApproveLoanCommand {
  constructor(
    readonly loanId: string,
    readonly reviewerUserId: string,
    readonly approve: boolean,
    readonly reason: string | undefined,
  ) {}
}
