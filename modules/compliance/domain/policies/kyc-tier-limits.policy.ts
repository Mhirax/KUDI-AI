import { KycTier } from '../enums/kyc-tier.enum';
import { Money } from '../../../../shared/value-objects/money.vo';
import { Currency } from '../../../../shared/enums/currency.enum';

export interface KycTierLimits {
  /** Largest single transfer allowed. `null` means no cap. */
  perTransactionLimit: Money | null;
  /** Combined transfer volume allowed in a rolling 24-hour window. `null` means no cap. */
  dailyTransferLimit: Money | null;
  /** Largest balance an account may hold. `null` means no cap. */
  maxBalance: Money | null;
}

/**
 * Default/seed figures, modeled on the CBN mobile-money tiered-KYC
 * circular (7 Sep 2017) via secondary sources — not verified against the
 * primary CBN document, and not confirmed by this business's compliance
 * function as the framework that actually governs its account type.
 * Treat as a reasonable starting point for a foundation build, not a
 * production-ready compliance answer. See
 * `modules/compliance/implementation.md`, Phase 1a.
 *
 * These values seed the `KycTierLimit` table (see
 * `infrastructure/prisma/seed.ts`) and act as the in-memory fallback
 * `PrismaKycTierLimitRepository` uses when a tier has no DB row yet —
 * the DB is the source of truth once seeded.
 */
const DEFAULT_LIMITS_MAJOR_UNITS_NGN: Record<
  KycTier,
  { perTransaction: string | null; daily: string | null; maxBalance: string | null }
> = {
  [KycTier.TIER_1]: { perTransaction: '50000', daily: '50000', maxBalance: '300000' },
  [KycTier.TIER_2]: { perTransaction: '200000', daily: '200000', maxBalance: '500000' },
  // Balance is uncapped at Tier 3, but the daily transfer limit is not —
  // the 2017 circular puts it at ₦5,000,000/day, not unlimited.
  [KycTier.TIER_3]: { perTransaction: '5000000', daily: '5000000', maxBalance: null },
};

function toMoneyOrNull(majorUnits: string | null, currency: Currency): Money | null {
  return majorUnits === null ? null : Money.fromDecimalString(majorUnits, currency);
}

/**
 * Returns the default transfer/balance limits for a given KYC tier.
 * Currently only NGN figures are defined — other currencies fall back
 * to the NGN schedule until multi-currency limits are needed.
 */
export function getDefaultKycTierLimits(tier: KycTier, currency: Currency = Currency.NGN): KycTierLimits {
  const config = DEFAULT_LIMITS_MAJOR_UNITS_NGN[tier];
  return {
    perTransactionLimit: toMoneyOrNull(config.perTransaction, currency),
    dailyTransferLimit: toMoneyOrNull(config.daily, currency),
    maxBalance: toMoneyOrNull(config.maxBalance, currency),
  };
}
