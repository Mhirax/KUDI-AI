export class ClearSanctionsFlagCommand {
  constructor(
    readonly staffUserId: string,
    readonly targetUserId: string,
    readonly reason: string,
  ) {}
}
