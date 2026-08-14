import { api } from './client';

// ─── KYC API ──────────────────────────────────────────────────────────────────
// NEW FILE — Compliance Module (Section 3.6 of the handover doc).
// KYC tiers follow the CBN framework:
//   TIER_1 — automatic on registration
//   TIER_2 — BVN verified
//   TIER_3 — BVN + NIN verified
// Higher tiers unlock higher transaction limits.
//
// No screen consumes this yet — Profile.jsx reads getStatus() for the tier
// badge, but the BVN/NIN submission screen itself is not built (see handover
// doc "Next Session" section).

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const MOCK_KYC = {
  userId: 'usr_mock_001',
  tier: 'TIER_1',
  bvnVerified: false,
  bvnMasked: null,
  ninVerified: false,
  ninMasked: null,
};

export const kycApi = {

  // GET /kyc/me  (AUTH REQUIRED)
  getStatus: async () => {
    if (MOCK) {
      await delay(400);
      return { ...MOCK_KYC };
    }
    return api.get('/kyc/me');
  },

  // POST /kyc/verify-bvn  (AUTH REQUIRED) — Body: { bvn } (11 digits)
  // Moves user from TIER_1 to TIER_2 on success.
  verifyBvn: async (bvn) => {
    if (MOCK) {
      await delay(1500);
      if (!/^\d{11}$/.test(bvn)) throw new Error('BVN must be 11 digits.');
      MOCK_KYC.bvnVerified = true;
      MOCK_KYC.bvnMasked = '*******' + bvn.slice(-4);
      MOCK_KYC.tier = 'TIER_2';
      return { ...MOCK_KYC };
    }
    return api.post('/kyc/verify-bvn', { bvn });
  },

  // POST /kyc/verify-nin  (AUTH REQUIRED) — Body: { nin } (11 digits)
  // Moves user from TIER_2 to TIER_3 on success.
  verifyNin: async (nin) => {
    if (MOCK) {
      await delay(1500);
      if (!/^\d{11}$/.test(nin)) throw new Error('NIN must be 11 digits.');
      MOCK_KYC.ninVerified = true;
      MOCK_KYC.ninMasked = '*******' + nin.slice(-4);
      MOCK_KYC.tier = 'TIER_3';
      return { ...MOCK_KYC };
    }
    return api.post('/kyc/verify-nin', { nin });
  },
};
