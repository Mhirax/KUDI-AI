import { pendingEndpoint } from './pending';

// ─── BILLS API — PENDING ──────────────────────────────────────────────────────
// No `bills` backend module exists. Biller lists, data bundles and pricing
// were previously hardcoded here — including `getDataBundles`, which returned
// mock bundles even with mock mode off. All of it is removed: showing invented
// prices for a purchase the user is about to make is not acceptable.
//
// BILL_CATEGORY is kept — it is the agreed category enum the backend module
// will implement against, not mock data.

export const BILL_CATEGORY = {
  AIRTIME:     'AIRTIME',
  MOBILE_DATA: 'MOBILE_DATA',
  ELECTRICITY: 'ELECTRICITY',
  CABLE_TV:    'CABLE_TV',
  INTERNET:    'INTERNET',
};

export const billsApi = {
  // GET /bills/billers?category=X
  getBillers: pendingEndpoint('bills', 'GET /bills/billers'),

  // No endpoint was ever specified for data bundles — the backend module
  // must define one. See docs/API-CONTRACT.md.
  getDataBundles: pendingEndpoint('bills', 'GET /bills/billers/:billerCode/items'),

  // POST /bills/validate-customer
  validateCustomer: pendingEndpoint('bills', 'POST /bills/validate-customer'),

  // POST /bills/pay
  pay: pendingEndpoint('bills', 'POST /bills/pay'),

  // GET /bills/me
  getHistory: pendingEndpoint('bills', 'GET /bills/me'),

  // GET /bills/:reference
  getByReference: pendingEndpoint('bills', 'GET /bills/:reference'),

  // POST /bills/:reference/refresh-status
  refreshStatus: pendingEndpoint('bills', 'POST /bills/:reference/refresh-status'),
};
