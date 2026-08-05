export class GetLedgerEntryByIdQuery {
  constructor(
    readonly entryId: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
