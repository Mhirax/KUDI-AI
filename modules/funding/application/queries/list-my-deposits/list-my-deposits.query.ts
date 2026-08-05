export class ListMyDepositsQuery {
  constructor(
    readonly userId: string,
    readonly page: number,
    readonly limit: number,
  ) {}
}
