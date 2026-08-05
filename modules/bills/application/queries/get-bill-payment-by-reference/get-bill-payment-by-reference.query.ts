export class GetBillPaymentByReferenceQuery {
  constructor(
    readonly reference: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
