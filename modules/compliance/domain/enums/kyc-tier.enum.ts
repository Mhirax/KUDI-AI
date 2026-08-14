/**
 * Modeled on the CBN (Central Bank of Nigeria) tiered KYC framework.
 * TIER_1 is granted automatically on registration (name + phone number
 * already collected by Identity satisfy the minimal requirement).
 * TIER_2 requires BVN verification; TIER_3 requires BVN *and* NIN.
 * Transaction-limit enforcement per tier is a documented future
 * enhancement (see module README), not implemented in this phase.
 */
export enum KycTier {
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}
