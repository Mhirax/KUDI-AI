export class ValidateBillCustomerQuery {
  constructor(
    readonly billerCode: string,
    readonly itemCode: string,
    readonly customerIdentifier: string,
  ) {}
}
