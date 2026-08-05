export class ListMyBillPaymentsQuery {
  constructor(
    readonly userId: string,
    readonly page: number,
    readonly limit: number,
  ) {}
}
