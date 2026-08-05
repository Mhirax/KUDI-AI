export class GetCardByIdQuery {
  constructor(
    readonly cardId: string,
    readonly requesterUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
