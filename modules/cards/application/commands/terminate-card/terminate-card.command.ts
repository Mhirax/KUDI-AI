export class TerminateCardCommand {
  constructor(
    readonly userId: string,
    readonly cardId: string,
    readonly isAdmin: boolean,
  ) {}
}
