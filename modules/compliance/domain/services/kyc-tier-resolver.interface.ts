import { KycTier } from '../enums/kyc-tier.enum';

export interface IKycTierResolver {
  /**
   * Resolves a user's current KYC tier. Falls back to the most
   * restrictive tier (TIER_1) if the user has no `KycProfile` — a data
   * anomaly (one is created automatically on registration), not
   * something callers should each need to branch on separately.
   *
   * `tx`, when given, is a Prisma interactive-transaction client to run
   * the underlying read through — see
   * `IKycProfileRepository.findByUserId`'s matching doc comment.
   */
  resolveTier(userId: string, tx?: any): Promise<KycTier>;
}

export const KYC_TIER_RESOLVER = Symbol('KYC_TIER_RESOLVER');
