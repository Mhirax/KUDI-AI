import { api } from './client';

// ─── LEDGER API ───────────────────────────────────────────────────────────────
// NEW FILE — Ledger Module (Section 3.7 of the handover doc).
// Read-only. Powers the transaction history screen. NOT a general
// /transactions endpoint — always scoped to an accountId.

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const MOCK_ENTRIES = [
  { id: 'led_001', accountId: 'acc_mock_001', direction: 'DEBIT',  description: 'Transfer to Mum',   amount: '2000.00',  createdAt: new Date(Date.now() - 1000*60*30).toISOString() },
  { id: 'led_002', accountId: 'acc_mock_001', direction: 'CREDIT', description: 'Salary',            amount: '80000.00', createdAt: new Date(Date.now() - 1000*60*60*3).toISOString() },
  { id: 'led_003', accountId: 'acc_mock_001', direction: 'DEBIT',  description: 'Airtime purchase',  amount: '500.00',   createdAt: new Date(Date.now() - 1000*60*60*8).toISOString() },
  { id: 'led_004', accountId: 'acc_mock_001', direction: 'CREDIT', description: 'Payment received',  amount: '3500.00',  createdAt: new Date(Date.now() - 1000*60*60*24).toISOString() },
];

export const ledgerApi = {

  // GET /ledger/accounts/:accountId/entries  (AUTH REQUIRED)
  // Supports ?from= and ?to= date filters, plus pagination.
  getAccountEntries: async (accountId, { limit = 20, page = 1, from, to } = {}) => {
    if (MOCK) {
      await delay(500);
      return {
        data: MOCK_ENTRIES.slice(0, limit),
        meta: { total: MOCK_ENTRIES.length, page, limit, totalPages: 1 },
      };
    }
    const params = new URLSearchParams({ limit, page });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api.get(`/ledger/accounts/${accountId}/entries?${params.toString()}`);
  },

  // Convenience wrapper — returns a plain array (unwraps .data) for
  // components that just want the list, e.g. Dashboard's recent transactions.
  getAccountEntriesList: async (accountId, options = {}) => {
    const response = await ledgerApi.getAccountEntries(accountId, options);
    return response.data ?? response;
  },

  // GET /ledger/accounts/:accountId/statement  (AUTH REQUIRED)
  // Full statement for a date range — opening balance, entries, closing balance.
  getStatement: async (accountId, { from, to } = {}) => {
    if (MOCK) {
      await delay(700);
      return {
        accountId,
        openingBalance: '60000.00',
        closingBalance: '142350.00',
        entries: MOCK_ENTRIES,
      };
    }
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return api.get(`/ledger/accounts/${accountId}/statement?${params.toString()}`);
  },

  // GET /ledger/entries/:entryId  (AUTH REQUIRED)
  getEntry: async (entryId) => {
    if (MOCK) {
      await delay(300);
      return MOCK_ENTRIES.find((e) => e.id === entryId) || MOCK_ENTRIES[0];
    }
    return api.get('/ledger/entries/' + entryId);
  },
};
