export class GetAccountLedgerQuery {
  constructor(
    readonly accountId: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
    readonly page: number,
    readonly limit: number,
    readonly from?: Date,
    readonly to?: Date,
  ) {}
}
