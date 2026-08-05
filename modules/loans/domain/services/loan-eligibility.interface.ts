export interface LoanEligibilityResult {
  isEligible: boolean;
  reason: string | null;
  /** Minor units — the maximum principal this user may request, given their tier. */
  maxPrincipalMinorUnits: bigint;
}

/**
 * Port for loan-eligibility rules. v1 is deliberately rules-based off
 * data the platform already has (KYC tier, account status/age) — no
 * external credit-bureau integration (see module README).
 */
export interface ILoanEligibilityService {
  assess(userId: string, accountId: string): Promise<LoanEligibilityResult>;
}

export const LOAN_ELIGIBILITY_SERVICE = Symbol('LOAN_ELIGIBILITY_SERVICE');
