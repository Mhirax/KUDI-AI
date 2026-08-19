/**
 * Modeled on the CBN (Central Bank of Nigeria) tiered KYC framework.
 * TIER_1 is granted automatically on registration (name + phone number
 * already collected by Identity satisfy the minimal requirement).
 * TIER_2 requires BVN verification; TIER_3 requires BVN *and* NIN.
 * Per-tier transaction/balance limits are defined in
 * `../policies/kyc-tier-limits.policy.ts`. Enforcement by Transfers
 * (per-transaction + daily cap) and Accounts (max balance) is not yet
 * wired in — tracked as Phase 1 in `../../implementation.md`.
 */
export enum KycTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}
