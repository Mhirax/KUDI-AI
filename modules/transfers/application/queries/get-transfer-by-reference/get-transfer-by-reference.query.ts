export class GetTransferByReferenceQuery {
  constructor(
    readonly reference: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
