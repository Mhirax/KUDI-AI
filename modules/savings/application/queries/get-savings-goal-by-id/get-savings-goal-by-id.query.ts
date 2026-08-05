export class GetSavingsGoalByIdQuery {
  constructor(
    readonly savingsGoalId: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
