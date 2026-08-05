export class UnfreezeCardCommand {
  constructor(
    readonly userId: string,
    readonly cardId: string,
    readonly isAdmin: boolean,
  ) {}
}
