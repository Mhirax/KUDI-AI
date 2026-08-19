import { KycTier } from '../enums/kyc-tier.enum';
import { KycTierLimits } from '../policies/kyc-tier-limits.policy';
import { Currency } from '../../../../shared/enums/currency.enum';

export interface IKycTierLimitRepository {
  /**
   * Always returns a usable limit set — falls back to
   * `getDefaultKycTierLimits()` when the tier has no DB row yet, so
   * callers never need a null case.
   */
  findByTier(tier: KycTier, currency?: Currency): Promise<KycTierLimits>;
}

export const KYC_TIER_LIMIT_REPOSITORY = Symbol('KYC_TIER_LIMIT_REPOSITORY');
