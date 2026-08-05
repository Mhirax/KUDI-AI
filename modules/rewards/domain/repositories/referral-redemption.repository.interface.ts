export interface ReferralRedemptionRecord {
  id: string;
  referralCode: string;
  referrerUserId: string;
  refereeUserId: string;
  createdAt: Date;
}

export interface IReferralRedemptionRepository {
  hasRefereeRedeemed(refereeUserId: string): Promise<boolean>;
  save(record: ReferralRedemptionRecord): Promise<void>;
}

export const REFERRAL_REDEMPTION_REPOSITORY = Symbol('REFERRAL_REDEMPTION_REPOSITORY');
