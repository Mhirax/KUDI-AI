export class CreateSavingsGoalCommand {
  constructor(
    readonly userId: string,
    readonly sourceAccountId: string,
    readonly name: string,
    /** Major-unit decimal string, or undefined for an open-ended goal. */
    readonly targetAmount: string | undefined,
  ) {}
}
