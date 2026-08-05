export class RequestPhysicalCardCommand {
  constructor(
    readonly userId: string,
    readonly accountId: string,
  ) {}
}
