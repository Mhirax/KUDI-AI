/**
 * Modeled on the CBN (Central Bank of Nigeria) tiered KYC framework.
 * TIER_1 is granted automatically on registration (name + phone number
 * already collected by Identity satisfy the minimal requirement).
 * TIER_2 requires BVN verification; TIER_3 requires BVN *and* NIN.
 * Per-tier transaction/balance limits are defined in
 * `../policies/kyc-tier-limits.policy.ts` and enforced by Transfers
 * (per-transaction + rolling 24h daily cap — see
 * `modules/transfers/infrastructure/services/kyc-transfer-limit-checker.service.ts`)
 * and Accounts (max balance on credit — see
 * `modules/accounts/infrastructure/services/max-balance-guard.service.ts`).
 * Phase 1 (`../../implementation.md`) is otherwise complete.
 */
export enum KycTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}
