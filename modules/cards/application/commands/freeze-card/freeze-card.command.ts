export class FreezeCardCommand {
  constructor(
    readonly userId: string,
    readonly cardId: string,
    readonly isAdmin: boolean,
  ) {}
}
