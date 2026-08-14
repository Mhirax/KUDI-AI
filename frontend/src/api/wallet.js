import { api } from './client';

// UPDATED — this file used to own balance + transactions, but neither
// endpoint exists on the real backend:
//   - Balance now comes from accountsApi.getMyAccounts() (src/api/accounts.js)
//   - Transaction history now comes from ledgerApi (src/api/ledger.js)
// Savings has no backend module at all yet, so it stays here as mock data
// until a Savings module is built.

const MOCK = import.meta.env.VITE_MOCK_API === 'true';

function mockDelay(ms = 600) {
  return new Promise((r) => setTimeout(r, ms));
}

const MOCK_SAVINGS = [
  { id: 'sav_001', name: 'Emergency Fund', targetKobo: 5000000,  savedKobo: 2000000 },
  { id: 'sav_002', name: 'Vacation',       targetKobo: 10000000, savedKobo: 1000000 },
];

export const walletApi = {

  // No backend endpoint — keep as mock until a Savings module ships.
  getSavings: async () => {
    if (MOCK) {
      await mockDelay(400);
      return MOCK_SAVINGS;
    }
    // Real API has no /savings endpoint yet. Fail soft with mock data
    // so the dashboard doesn't break — replace this once the module exists.
    return MOCK_SAVINGS;
  },
};
