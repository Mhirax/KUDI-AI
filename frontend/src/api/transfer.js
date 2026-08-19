import { api } from './client';

// ─── TRANSFER API ─────────────────────────────────────────────────────────────
// LIVE against the transfers module. Amounts are major-unit decimal strings
// ('1500.00'), never kobo integers. sourceAccountId is required on initiate.

// ── Bank list ─────────────────────────────────────────────────────────────────
// KNOWN GAP: there is no GET /transfers/banks endpoint. This static list is a
// frontend assumption with no backend contract behind it — bank codes are not
// validated against the provider until the transfer is initiated.
// Tracked as mismatch #2 in docs/API-CONTRACT.md.
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

// Mirrors shared/enums/transaction-status.enum.ts — never type these manually.
export const TX_STATUS = {
  PENDING:    'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED:     'FAILED',
  REVERSED:   'REVERSED',
  CANCELLED:  'CANCELLED',
};

// KNOWN GAP: the backend defines IDEMPOTENCY_HEADER = 'x-idempotency-key' in
// shared/constants/index.ts but no handler reads it. Sending it is therefore
// currently a no-op — a retried transfer creates a second debit.
//
// Generating the key here (once per call) is also wrong: a genuine retry needs
// the SAME key as the original attempt. The key must be created once per user
// intent by the calling screen and passed in. Left as a parameter so the
// call sites are already shaped correctly when the backend starts honouring it.
// Tracked as mismatch #1 in docs/API-CONTRACT.md.
function idempotencyHeaders(idempotencyKey) {
  return idempotencyKey ? { headers: { 'x-idempotency-key': idempotencyKey } } : {};
}

export const transferApi = {

  // Static list — see BANKS above.
  getBanks: async () => BANKS,

  // POST /transfers/external  (AUTH REQUIRED)
  // Body: { sourceAccountId, bankCode, recipientAccountNumber,
  //         recipientAccountName, amount, narration }
  initiateExternal: ({ sourceAccountId, bankCode, recipientAccountNumber, recipientAccountName, amount, narration, idempotencyKey }) =>
    api.post(
      '/transfers/external',
      { sourceAccountId, bankCode, recipientAccountNumber, recipientAccountName, amount, narration },
      idempotencyHeaders(idempotencyKey),
    ),

  // POST /transfers/internal  (AUTH REQUIRED) — Kudi-to-Kudi, instant.
  // Body: { sourceAccountId, destinationAccountId, amount, narration }
  //
  // NOT CALLED BY ANY SCREEN. The backend is complete, but there is no UI to
  // pick a destination Kudi account — that needs a user/account lookup
  // endpoint which does not exist. Tracked as mismatch #6.
  initiateInternal: ({ sourceAccountId, destinationAccountId, amount, narration, idempotencyKey }) =>
    api.post(
      '/transfers/internal',
      { sourceAccountId, destinationAccountId, amount, narration },
      idempotencyHeaders(idempotencyKey),
    ),

  // GET /transfers/me  (AUTH REQUIRED) — { data, meta }
  getMyTransfers: () => api.get('/transfers/me'),

  // GET /transfers/:reference  (AUTH REQUIRED)
  // Poll every 3s for external transfers until status leaves PENDING/PROCESSING.
  // Internal transfers resolve to SUCCESSFUL immediately — no polling needed.
  getByReference: (reference) => api.get('/transfers/' + reference),
};
