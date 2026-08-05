export class RefreshBillPaymentStatusCommand {
  constructor(
    readonly reference: string,
    readonly requestingUserId: string,
    readonly isAdmin: boolean,
  ) {}
}
