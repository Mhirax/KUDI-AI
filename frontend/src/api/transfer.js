import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 800) => new Promise((r) => setTimeout(r, ms));

// ── Bank list ──────────────────────────────────────────────────────────────────
// No GET /transfer/banks (or equivalent) endpoint exists on the backend — this
// stays a static local list for the RecipientStep dropdown in both mock and
// real mode.
export const BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank' },
  { code: '050', name: 'EcoBank' },
  { code: '011', name: 'First Bank' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'GTBank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank' },
  { code: '033', name: 'United Bank for Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

// ─── TRANSFER STATUS CONSTANTS ────────────────────────────────────────────────
// Sourced directly from backend: shared/enums/transaction-status.enum.ts
// Use these constants everywhere — never type the string manually again.
export const TX_STATUS = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED:     'FAILED',
  REVERSED:   'REVERSED',
  CANCELLED:  'CANCELLED',
};

function mockTransferResponse(overrides = {}) {
  return {
    id: 'trf_' + Date.now(),
    reference: 'KDI_' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    status: TX_STATUS.PENDING,
    amount: '0.00',
    fee: '50.00',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─── TRANSFER API ─────────────────────────────────────────────────────────────
// UPDATED — no more name-enquiry endpoint (recipient name is typed manually,
// verified during initiation instead). Amounts are decimal strings, e.g.
// '1500.00', not kobo integers. sourceAccountId is required on every initiate
// call.
//
// NOTE FOR NEXT SESSION: only the external (send-to-bank) flow is wired up —
// it matches what RecipientStep already collects (bank + account number).
// Internal Kudi-to-Kudi transfer (POST /transfers/internal) needs a
// destinationAccountId (another user's account UUID), which has no UI yet.
// initiateInternal() below is implemented and ready, just not called anywhere.

export const transferApi = {

  // Static list — see BANKS above. Kept as a method so existing callers
  // (RecipientStep) don't need to change their import shape.
  getBanks: async () => {
    if (MOCK) await delay(300);
    return BANKS;
  },

  // POST /transfers/external  (AUTH REQUIRED)
  // Body: { sourceAccountId, bankCode, recipientAccountNumber,
  //         recipientAccountName, amount, narration }
  initiateExternal: async ({ sourceAccountId, bankCode, recipientAccountNumber, recipientAccountName, amount, narration }) => {
    if (MOCK) {
      await delay(1500);
      if (Math.random() < 0.15) {
        throw new Error('Transfer could not be initiated. Please try again.');
      }
      return mockTransferResponse({ amount, sourceAccountId, recipientAccountNumber, recipientAccountName });
    }
    return api.post('/transfers/external', {
      sourceAccountId, bankCode, recipientAccountNumber, recipientAccountName, amount, narration,
    }, {
      headers: { 'x-idempotency-key': crypto.randomUUID() },
    });
  },

  // POST /transfers/internal  (AUTH REQUIRED) — Kudi-to-Kudi, instant.
  // Body: { sourceAccountId, destinationAccountId, amount, narration }
  // Not yet called from any screen — see note above.
  initiateInternal: async ({ sourceAccountId, destinationAccountId, amount, narration }) => {
    if (MOCK) {
      await delay(800);
      return mockTransferResponse({ amount, sourceAccountId, destinationAccountId, status: TX_STATUS.SUCCESSFUL, fee: '0.00' });
    }
    return api.post('/transfers/internal', { sourceAccountId, destinationAccountId, amount, narration }, {
      headers: { 'x-idempotency-key': crypto.randomUUID() },
    });
  },

  // GET /transfers/me  (AUTH REQUIRED) — list user's transfers
  getMyTransfers: async () => {
    if (MOCK) {
      await delay(500);
      return { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
    return api.get('/transfers/me');
  },

  // GET /transfers/:reference  (AUTH REQUIRED)
  // Poll this every 3s for external transfers until status leaves PENDING/PROCESSING.
  // Internal transfers resolve to SUCCESSFUL immediately — no polling needed.
  getByReference: async (reference) => {
    if (MOCK) {
      await delay(1000);
      const rand = Math.random();
      if (rand < 0.65) return mockTransferResponse({ reference, status: TX_STATUS.SUCCESSFUL });
      if (rand < 0.80) return mockTransferResponse({ reference, status: TX_STATUS.PENDING });
      if (rand < 0.90) return mockTransferResponse({ reference, status: TX_STATUS.PROCESSING });
      return mockTransferResponse({ reference, status: TX_STATUS.FAILED, reason: 'Insufficient funds in recipient account.' });
    }
    return api.get('/transfers/' + reference);
  },
};
