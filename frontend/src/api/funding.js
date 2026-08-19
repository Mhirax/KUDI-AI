import { pendingEndpoint } from './pending';

// ─── FUNDING API — PENDING ────────────────────────────────────────────────────
// No `funding` backend module exists. This is the module that lets money get
// *into* an account — virtual account numbers and Flutterwave checkout.
//
// No screen consumes this yet either; the "Fund Wallet" UI is not built.
// Listed here so the contract is tracked rather than forgotten.

export const fundingApi = {
  // POST /funding/virtual-accounts — Body: { accountId }
  createVirtualAccount: pendingEndpoint('funding', 'POST /funding/virtual-accounts'),

  // GET /funding/virtual-accounts/me
  getMyVirtualAccount: pendingEndpoint('funding', 'GET /funding/virtual-accounts/me'),

  // POST /funding/checkout — Body: { accountId, amount } -> { deposit, paymentLink }
  createCheckout: pendingEndpoint('funding', 'POST /funding/checkout'),

  // GET /funding/deposits/me — paginated
  getMyDeposits: pendingEndpoint('funding', 'GET /funding/deposits/me'),

  // GET /funding/deposits/:reference
  getDeposit: pendingEndpoint('funding', 'GET /funding/deposits/:reference'),
};
