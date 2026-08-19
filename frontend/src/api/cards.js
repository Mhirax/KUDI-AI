import { pendingEndpoint } from './pending';

// ─── CARDS API — PENDING ──────────────────────────────────────────────────────
// No `cards` backend module exists. Two fake cards (including balances and
// last-4 digits) were previously hardcoded here; that mock data is removed.
//
// NOTE ON UNITS: `topUp` was written against a kobo integer. The live
// convention is major-unit decimal strings — see docs/API-CONTRACT.md.

export const cardsApi = {
  // GET /cards
  getCards: pendingEndpoint('cards', 'GET /cards'),

  // POST /cards/:id/freeze
  freeze: pendingEndpoint('cards', 'POST /cards/:id/freeze'),

  // POST /cards/request-physical
  requestPhysical: pendingEndpoint('cards', 'POST /cards/request-physical'),

  // POST /cards/:id/topup
  topUp: pendingEndpoint('cards', 'POST /cards/:id/topup'),
};
