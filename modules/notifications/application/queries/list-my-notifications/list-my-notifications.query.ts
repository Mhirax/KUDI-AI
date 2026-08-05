export class ListMyNotificationsQuery {
  constructor(
    readonly userId: string,
    readonly page: number,
    readonly limit: number,
    readonly unreadOnly: boolean,
  ) {}
}
