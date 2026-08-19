import { KycTier } from '../enums/kyc-tier.enum';
import { KycTierLimits } from '../policies/kyc-tier-limits.policy';
import { Currency } from '../../../../shared/enums/currency.enum';

export interface IKycTierLimitRepository {
  /**
   * Always returns a usable limit set — falls back to
   * `getDefaultKycTierLimits()` when the tier has no DB row yet, so
   * callers never need a null case.
   *
   * `tx`, when given, is a Prisma interactive-transaction client to run
   * this read through instead of the module-level connection — see
   * `IKycProfileRepository.findByUserId`'s matching doc comment.
   */
  findByTier(tier: KycTier, currency?: Currency, tx?: any): Promise<KycTierLimits>;
}

export const KYC_TIER_LIMIT_REPOSITORY = Symbol('KYC_TIER_LIMIT_REPOSITORY');
