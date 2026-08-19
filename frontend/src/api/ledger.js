import { pendingEndpoint } from './pending';

// ─── LEDGER API — PENDING ─────────────────────────────────────────────────────
// No `ledger` backend module exists. There is no LedgerEntry table and no
// double-entry journal — see docs/AUDIT.md §4.1.
//
// Until it is built there is NO source of transaction history. Previously
// this file returned four hardcoded transactions; that mock data is removed.
// Dashboard now renders an explicit pending state instead.
//
// Endpoint shapes below are the intended contract, kept so the backend has a
// target to build against.

export const ledgerApi = {
  // GET /ledger/accounts/:accountId/entries?limit=&page=&from=&to=
  getAccountEntries: pendingEndpoint('ledger', 'GET /ledger/accounts/:accountId/entries'),

  // Convenience wrapper — unwraps `.data` to a plain array for list views.
  getAccountEntriesList: pendingEndpoint('ledger', 'GET /ledger/accounts/:accountId/entries'),

  // GET /ledger/accounts/:accountId/statement?from=&to=
  getStatement: pendingEndpoint('ledger', 'GET /ledger/accounts/:accountId/statement'),

  // GET /ledger/entries/:entryId
  getEntry: pendingEndpoint('ledger', 'GET /ledger/entries/:entryId'),
};
