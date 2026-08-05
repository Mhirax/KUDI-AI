export class FreezeAccountCommand {
  constructor(
    readonly accountId: string,
    readonly reason: string,
  ) {}
}
