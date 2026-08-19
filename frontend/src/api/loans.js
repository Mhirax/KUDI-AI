import { pendingEndpoint } from './pending';

// ─── LOANS API — PENDING ──────────────────────────────────────────────────────
// No `loans` backend module exists. Two fake loan offers with invented
// interest rates and tenors were previously hardcoded here; that mock data is
// removed. Showing invented credit terms to a user is a compliance risk, not
// just a UX one.
//
// NOTE ON UNITS: written against `amountKobo` integers. The live convention
// is major-unit decimal strings — see docs/API-CONTRACT.md.

export const loansApi = {
  // GET /loans/offers
  getOffers: pendingEndpoint('loans', 'GET /loans/offers'),

  // GET /loans/active
  getActive: pendingEndpoint('loans', 'GET /loans/active'),

  // POST /loans/apply
  apply: pendingEndpoint('loans', 'POST /loans/apply'),

  // POST /loans/:id/repay
  repay: pendingEndpoint('loans', 'POST /loans/:id/repay'),
};
