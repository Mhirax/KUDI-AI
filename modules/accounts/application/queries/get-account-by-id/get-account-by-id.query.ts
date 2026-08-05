export class GetAccountByIdQuery {
  constructor(
    readonly accountId: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
