import { pendingEndpoint } from './pending';

// ─── REWARDS API — PENDING ────────────────────────────────────────────────────
// No `rewards` backend module exists. Points balances, tiers and redemption
// catalogue were previously hardcoded in this file; that mock data is removed.

export const rewardsApi = {
  // GET /rewards
  getRewards: pendingEndpoint('rewards', 'GET /rewards'),

  // POST /rewards/redeem
  redeem: pendingEndpoint('rewards', 'POST /rewards/redeem'),
};
