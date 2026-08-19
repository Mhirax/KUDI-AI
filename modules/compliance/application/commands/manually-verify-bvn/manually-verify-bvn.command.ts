export class ManuallyVerifyBvnCommand {
  constructor(
    readonly staffUserId: string,
    readonly targetUserId: string,
    readonly bvn: string,
    readonly reason: string,
  ) {}
}
