import { pendingEndpoint } from './pending';

// ─── BENEFICIARIES API — PENDING ──────────────────────────────────────────────
// No `beneficiaries` backend module exists. Three fake saved recipients were
// previously hardcoded here; that mock data is removed.
//
// Transfer's RecipientStep degrades gracefully: the saved-recipients list is
// simply absent, and manual bank + account-number entry still works against
// the real POST /transfers/external endpoint.

export const beneficiaryApi = {
  // GET /beneficiaries
  getAll: pendingEndpoint('beneficiaries', 'GET /beneficiaries'),

  // POST /beneficiaries
  save: pendingEndpoint('beneficiaries', 'POST /beneficiaries'),

  // DELETE /beneficiaries/:id
  remove: pendingEndpoint('beneficiaries', 'DELETE /beneficiaries/:id'),
};
