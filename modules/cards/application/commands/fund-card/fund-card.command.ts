export class FundCardCommand {
  constructor(
    readonly userId: string,
    readonly cardId: string,
    /** Major-unit decimal string. */
    readonly amount: string,
  ) {}
}
