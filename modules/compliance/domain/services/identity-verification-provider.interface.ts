export interface IdentityVerificationResult {
  matched: boolean;
  verifiedFullName: string | null;
}

/**
 * Port abstracting the external identity-verification rail
 * (Flutterwave's BVN/NIN resolution endpoints) away from the
 * application layer. `expectedFirstName`/`expectedLastName` are the
 * user's own registered names (from Identity); the concrete
 * implementation compares them against what the provider returns and
 * reports `matched` — the application layer never sees the raw
 * provider response, only this yes/no-plus-name result.
 */
export interface IIdentityVerificationProvider {
  verifyBvn(params: {
    bvn: string;
    expectedFirstName: string;
    expectedLastName: string;
  }): Promise<IdentityVerificationResult>;

  verifyNin(params: {
    nin: string;
    expectedFirstName: string;
    expectedLastName: string;
  }): Promise<IdentityVerificationResult>;
}

export const IDENTITY_VERIFICATION_PROVIDER = Symbol('IDENTITY_VERIFICATION_PROVIDER');
