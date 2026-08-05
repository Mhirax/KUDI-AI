export class GetAccountStatementQuery {
  constructor(
    readonly accountId: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
    readonly from: Date,
    readonly to: Date,
  ) {}
}
