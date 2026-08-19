import { api } from './client';

// ─── ACCOUNTS API ─────────────────────────────────────────────────────────────
// LIVE against the accounts module.
//
// IMPORTANT: `balance` is a major-unit DECIMAL STRING like '5000.00', not a
// kobo integer. The database stores BigInt minor units; AccountResponseDto
// converts on the way out. Use parseFloat(account.balance) before formatting.
//
// accountType is one of WALLET | SAVINGS | CURRENT (AccountType enum).
// WALLET is the primary product type.

export const accountsApi = {

  // POST /accounts  (AUTH REQUIRED) — Body: { accountType, currency? }
  createAccount: (payload) => api.post('/accounts', payload),

  // GET /accounts/me  (AUTH REQUIRED) — array of the user's accounts.
  // List endpoints return { data, meta } — unwrap so callers always get an array.
  getMyAccounts: async () => {
    const response = await api.get('/accounts/me');
    return response.data ?? response;
  },

  // GET /accounts/:accountId  (owner or admin)
  getAccount: (accountId) => api.get('/accounts/' + accountId),

  // POST /accounts/:id/close  (owner) — closes a zero-balance account
  closeAccount: (accountId) => api.post('/accounts/' + accountId + '/close', {}),

  // NOTE: POST /accounts/:id/{credit,debit,freeze,unfreeze} exist on the
  // backend but are ADMIN/Compliance-only. Never called from this client.
};
