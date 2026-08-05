export class GetDepositByReferenceQuery {
  constructor(
    readonly reference: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
