export class ListLoansQuery {
  constructor(
    readonly requesterUserId: string,
    readonly isAdmin: boolean,
    readonly page: number,
    readonly pageSize: number,
  ) {}
}
