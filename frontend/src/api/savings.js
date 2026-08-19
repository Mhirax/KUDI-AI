import { pendingEndpoint } from './pending';

// ─── SAVINGS API — PENDING ────────────────────────────────────────────────────
// No `savings` backend module exists.
//
// NOTE ON UNITS: this client was originally written against `targetKobo` /
// `savedKobo` integer fields. That contradicts every live endpoint, which
// uses major-unit decimal strings ("1500.00"). When the savings module is
// built it must follow the live convention — see docs/API-CONTRACT.md.

export const savingsApi = {
  // GET /savings
  getAll: pendingEndpoint('savings', 'GET /savings'),

  // POST /savings
  create: pendingEndpoint('savings', 'POST /savings'),

  // POST /savings/:id/topup
  topUp: pendingEndpoint('savings', 'POST /savings/:id/topup'),

  // DELETE /savings/:id
  remove: pendingEndpoint('savings', 'DELETE /savings/:id'),
};
