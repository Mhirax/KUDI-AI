export class GetLoanByIdQuery {
  constructor(
    readonly loanId: string,
    readonly requesterUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
