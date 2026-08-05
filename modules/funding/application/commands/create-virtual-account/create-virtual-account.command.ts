export class CreateVirtualAccountCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
  ) {}
}
