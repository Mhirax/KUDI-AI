import { api } from './client';

// ─── FUNDING API ──────────────────────────────────────────────────────────────
// NEW FILE — Funding Module (Section 3.4 of the handover doc). Adds money to
// a Kudi AI account via a dedicated virtual bank account number or a
// Flutterwave card checkout session.
//
// No screen consumes this yet — the "Fund Wallet" screen itself is not built.
// See handover doc Step 10 / "Next Session" section.

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const MOCK_VIRTUAL_ACCOUNT = {
  virtualAccountNumber: '9012345678',
  bankName: 'Wema Bank',
  isActive: true,
};

export const fundingApi = {

  // POST /funding/virtual-accounts  (AUTH REQUIRED) — Body: { accountId }
  // Creates a virtual bank account number tied to the user's account.
  createVirtualAccount: async (accountId) => {
    if (MOCK) {
      await delay(1000);
      return { ...MOCK_VIRTUAL_ACCOUNT };
    }
    return api.post('/funding/virtual-accounts', { accountId });
  },

  // GET /funding/virtual-accounts/me  (AUTH REQUIRED)
  getMyVirtualAccount: async () => {
    if (MOCK) {
      await delay(400);
      return { ...MOCK_VIRTUAL_ACCOUNT };
    }
    return api.get('/funding/virtual-accounts/me');
  },

  // POST /funding/checkout  (AUTH REQUIRED) — Body: { accountId, amount }
  // Returns { deposit, paymentLink } — a Flutterwave checkout session.
  createCheckout: async ({ accountId, amount }) => {
    if (MOCK) {
      await delay(900);
      return {
        deposit: { id: 'dep_' + Date.now(), reference: 'DEP_' + Date.now(), status: 'PENDING', amount },
        paymentLink: 'https://checkout.flutterwave.com/mock/' + Date.now(),
      };
    }
    return api.post('/funding/checkout', { accountId, amount });
  },

  // GET /funding/deposits/me  (AUTH REQUIRED) — paginated
  getMyDeposits: async () => {
    if (MOCK) {
      await delay(500);
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    return api.get('/funding/deposits/me');
  },

  // GET /funding/deposits/:reference  (AUTH REQUIRED) — for status checking
  getDeposit: async (reference) => {
    if (MOCK) {
      await delay(400);
      return { reference, status: 'SUCCESSFUL' };
    }
    return api.get('/funding/deposits/' + reference);
  },
};
