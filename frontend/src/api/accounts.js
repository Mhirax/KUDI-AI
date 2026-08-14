import { api } from './client';

// ─── ACCOUNTS API ─────────────────────────────────────────────────────────────
// NEW FILE — Accounts Module (Section 3.2 of the handover doc).
// GET /accounts/me returns an array of the user's internal bank accounts.
// The `id` of the first account is the accountId used everywhere else
// (ledger, transfers, funding, bills).
//
// IMPORTANT: balance is a DECIMAL STRING like '5000.00', NOT a kobo integer.
// Convert with parseFloat(account.balance) before formatting.

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const MOCK_ACCOUNTS = [
  {
    id: 'acc_mock_001',
    userId: 'usr_mock_001',
    accountType: 'PERSONAL',
    currency: 'NGN',
    balance: '142350.00',
    status: 'ACTIVE',
    createdAt: '2024-01-15T10:30:00.000Z',
  },
];

export const accountsApi = {

  // POST /accounts  (AUTH REQUIRED)
  // Body: { accountType, currency? } — creates a new account
  createAccount: async (payload) => {
    if (MOCK) {
      await delay(700);
      return { ...MOCK_ACCOUNTS[0], ...payload, id: 'acc_mock_' + Date.now(), balance: '0.00' };
    }
    return api.post('/accounts', payload);
  },

  // GET /accounts/me  (AUTH REQUIRED)
  // Returns array of the user's accounts
  getMyAccounts: async () => {
    if (MOCK) {
      await delay(500);
      return MOCK_ACCOUNTS;
    }
    const response = await api.get('/accounts/me');
    // List endpoints return { data: [], meta: {} } — unwrap so callers
    // always get a plain array.
    return response.data ?? response;
  },

  // GET /accounts/:accountId  (Owner or admin)
  getAccount: async (accountId) => {
    if (MOCK) {
      await delay(400);
      return MOCK_ACCOUNTS.find((a) => a.id === accountId) || MOCK_ACCOUNTS[0];
    }
    return api.get('/accounts/' + accountId);
  },

  // POST /accounts/:id/close  (Account owner) — closes a zero-balance account
  closeAccount: async (accountId) => {
    if (MOCK) {
      await delay(600);
      return { ...MOCK_ACCOUNTS[0], status: 'CLOSED' };
    }
    return api.post('/accounts/' + accountId + '/close', {});
  },

  // NOTE: POST /accounts/:id/credit and POST /accounts/:id/freeze are
  // ADMIN/Compliance-only — never called by frontend users. Not implemented here.
};
