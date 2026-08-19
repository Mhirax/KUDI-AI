export class ManuallyVerifyNinCommand {
  constructor(
    readonly staffUserId: string,
    readonly targetUserId: string,
    readonly nin: string,
    readonly reason: string,
  ) {}
}
