import { api } from './client';

// ─── KYC API ──────────────────────────────────────────────────────────────────
// LIVE against the compliance module. Tiers follow the CBN framework:
//   TIER_1 — automatic on registration
//   TIER_2 — BVN verified
//   TIER_3 — BVN + NIN verified
// Higher tiers unlock higher transaction limits.

export const kycApi = {

  // GET /kyc/me  (AUTH REQUIRED)
  // Returns { userId, tier, bvnVerified, bvnMasked, ninVerified, ninMasked }
  getStatus: () => api.get('/kyc/me'),

  // POST /kyc/verify-bvn  (AUTH REQUIRED) — Body: { bvn } (11 digits)
  // Moves the user from TIER_1 to TIER_2 on success.
  verifyBvn: (bvn) => api.post('/kyc/verify-bvn', { bvn }),

  // POST /kyc/verify-nin  (AUTH REQUIRED) — Body: { nin } (11 digits)
  // Moves the user from TIER_2 to TIER_3 on success.
  verifyNin: (nin) => api.post('/kyc/verify-nin', { nin }),
};
