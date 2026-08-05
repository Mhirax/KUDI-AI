import { RedemptionType } from '../../../domain/enums/redemption-type.enum';

export class RedeemRewardPointsCommand {
  constructor(
    readonly userId: string,
    readonly points: number,
    readonly redemptionType: RedemptionType,
    readonly accountId: string | undefined,
    readonly billerCode: string | undefined,
    readonly itemCode: string | undefined,
    readonly billerName: string | undefined,
    readonly customerIdentifier: string | undefined,
  ) {}
}
