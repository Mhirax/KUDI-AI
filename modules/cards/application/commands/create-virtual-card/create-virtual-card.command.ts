export class CreateVirtualCardCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
  ) {}
}
