export class RedeemReferralCodeCommand {
  constructor(
    readonly userId: string,
    readonly referralCode: string,
  ) {}
}
