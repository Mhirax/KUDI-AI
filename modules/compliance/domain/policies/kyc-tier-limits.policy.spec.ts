import { getDefaultKycTierLimits } from './kyc-tier-limits.policy';
import { KycTier } from '../enums/kyc-tier.enum';
import { Currency } from '../../../../shared/enums/currency.enum';

describe('getDefaultKycTierLimits', () => {
  it('returns Tier 1 limits: 50,000 per-transaction/daily, 300,000 max balance', () => {
    const limits = getDefaultKycTierLimits(KycTier.TIER_1, Currency.NGN);
    expect(limits.perTransactionLimit?.toMajorUnitsString()).toBe('50000.00');
    expect(limits.dailyTransferLimit?.toMajorUnitsString()).toBe('50000.00');
    expect(limits.maxBalance?.toMajorUnitsString()).toBe('300000.00');
  });

  it('returns Tier 2 limits: 200,000 per-transaction/daily, 500,000 max balance', () => {
    const limits = getDefaultKycTierLimits(KycTier.TIER_2, Currency.NGN);
    expect(limits.perTransactionLimit?.toMajorUnitsString()).toBe('200000.00');
    expect(limits.dailyTransferLimit?.toMajorUnitsString()).toBe('200000.00');
    expect(limits.maxBalance?.toMajorUnitsString()).toBe('500000.00');
  });

  it('returns Tier 3 limits: 5,000,000 per-transaction/daily, uncapped balance', () => {
    const limits = getDefaultKycTierLimits(KycTier.TIER_3, Currency.NGN);
    expect(limits.perTransactionLimit?.toMajorUnitsString()).toBe('5000000.00');
    expect(limits.dailyTransferLimit?.toMajorUnitsString()).toBe('5000000.00');
    expect(limits.maxBalance).toBeNull();
  });

  it('defaults to NGN when no currency is given', () => {
    const limits = getDefaultKycTierLimits(KycTier.TIER_1);
    expect(limits.perTransactionLimit?.getCurrency()).toBe(Currency.NGN);
  });

  it('applies the requested currency to every non-null figure', () => {
    const limits = getDefaultKycTierLimits(KycTier.TIER_2, Currency.USD);
    expect(limits.perTransactionLimit?.getCurrency()).toBe(Currency.USD);
    expect(limits.dailyTransferLimit?.getCurrency()).toBe(Currency.USD);
    expect(limits.maxBalance?.getCurrency()).toBe(Currency.USD);
  });
});
