export class CloseSavingsGoalCommand {
  constructor(
    readonly userId: string,
    readonly savingsGoalId: string,
  ) {}
}
