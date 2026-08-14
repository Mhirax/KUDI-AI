import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

// ─── CATEGORY ENUM ────────────────────────────────────────────────────────────
// Must match the backend enum exactly — sourced from Section 3.5 of the
// handover doc. 'data' -> MOBILE_DATA, 'cable' -> CABLE_TV, and INTERNET is new.
export const BILL_CATEGORY = {
  AIRTIME:     'AIRTIME',
  MOBILE_DATA: 'MOBILE_DATA',
  ELECTRICITY: 'ELECTRICITY',
  CABLE_TV:    'CABLE_TV',
  INTERNET:    'INTERNET',
};

// ── Mock providers (billers) ──────────────────────────────────────────────────
const MOCK_BILLERS = {
  [BILL_CATEGORY.AIRTIME]: [
    { billerCode: 'mtn',     name: 'MTN',     logo: '🟡' },
    { billerCode: 'airtel',  name: 'Airtel',  logo: '🔴' },
    { billerCode: 'glo',     name: 'Glo',     logo: '🟢' },
    { billerCode: '9mobile', name: '9mobile', logo: '🟢' },
  ],
  [BILL_CATEGORY.MOBILE_DATA]: [
    { billerCode: 'mtn',     name: 'MTN Data',     logo: '🟡' },
    { billerCode: 'airtel',  name: 'Airtel Data',  logo: '🔴' },
    { billerCode: 'glo',     name: 'Glo Data',     logo: '🟢' },
    { billerCode: '9mobile', name: '9mobile Data', logo: '🟢' },
  ],
  [BILL_CATEGORY.ELECTRICITY]: [
    { billerCode: 'ekedc', name: 'Eko Electric (EKEDC)',   logo: '⚡' },
    { billerCode: 'ikedc', name: 'Ikeja Electric (IKEDC)', logo: '⚡' },
    { billerCode: 'aedc',  name: 'Abuja Electric (AEDC)',  logo: '⚡' },
    { billerCode: 'phedc', name: 'Port Harcourt Electric', logo: '⚡' },
    { billerCode: 'kedco', name: 'Kano Electric (KEDCO)',  logo: '⚡' },
  ],
  [BILL_CATEGORY.CABLE_TV]: [
    { billerCode: 'dstv',      name: 'DStv',      logo: '📺' },
    { billerCode: 'gotv',      name: 'GOtv',      logo: '📺' },
    { billerCode: 'startimes', name: 'StarTimes', logo: '📺' },
  ],
  [BILL_CATEGORY.INTERNET]: [
    { billerCode: 'smile',   name: 'Smile',   logo: '🌐' },
    { billerCode: 'spectranet', name: 'Spectranet', logo: '🌐' },
  ],
};

const MOCK_DATA_BUNDLES = {
  mtn:     [{ itemCode: 'mtn_1gb',  name: '1GB',  validity: '30 days', priceKobo: 100000 }, { itemCode: 'mtn_2gb',  name: '2GB',  validity: '30 days', priceKobo: 150000 }],
  airtel:  [{ itemCode: 'airt_1gb', name: '1GB',  validity: '30 days', priceKobo: 100000 }],
  glo:     [{ itemCode: 'glo_1gb',  name: '1GB',  validity: '30 days', priceKobo: 100000 }],
  '9mobile': [{ itemCode: '9m_1gb', name: '1GB',  validity: '30 days', priceKobo: 80000 }],
};

// ─── BILLS API ────────────────────────────────────────────────────────────────
// UPDATED to match the Bills module (Section 3.5 of the handover doc):
//   GET  /bills/billers?category=X
//   POST /bills/validate-customer   { billerCode, itemCode, customerIdentifier }
//   POST /bills/pay                 { accountId, category, billerCode, itemCode, billerName, customerIdentifier, amount }
//   GET  /bills/me
//   GET  /bills/:reference
//   POST /bills/:reference/refresh-status

export const billsApi = {

  // GET /bills/billers?category=X
  getBillers: async (category) => {
    if (MOCK) {
      await delay(400);
      return MOCK_BILLERS[category] || [];
    }
    return api.get('/bills/billers?category=' + category);
  },

  // Data bundles have no dedicated endpoint documented yet — kept as mock
  // lookup keyed by billerCode until the backend exposes one.
  getDataBundles: async (billerCode) => {
    if (MOCK) {
      await delay(500);
      return MOCK_DATA_BUNDLES[billerCode] || [];
    }
    return MOCK_DATA_BUNDLES[billerCode] || [];
  },

  // POST /bills/validate-customer
  // Body: { billerCode, itemCode, customerIdentifier } — shows customer name
  // before payment (e.g. meter/smart-card holder name).
  validateCustomer: async ({ billerCode, itemCode, customerIdentifier }) => {
    if (MOCK) {
      await delay(800);
      return { customerName: 'Verified Customer', billerCode, itemCode, customerIdentifier };
    }
    return api.post('/bills/validate-customer', { billerCode, itemCode, customerIdentifier });
  },

  // POST /bills/pay
  // Body: { accountId, category, billerCode, itemCode, billerName, customerIdentifier, amount }
  // amount is a decimal string, e.g. '1500.00'.
  pay: async (payload) => {
    if (MOCK) {
      await delay(1300);
      if (Math.random() < 0.1) throw new Error('Payment failed. Please try again.');
      return {
        id: 'bll_' + Date.now(),
        reference: 'BLL_' + Date.now(),
        status: 'SUCCESSFUL',
        category: payload.category,
        amount: payload.amount,
        valueToken: payload.category === BILL_CATEGORY.ELECTRICITY ? '4827 3910 2837 4856 1029' : undefined,
      };
    }
    return api.post('/bills/pay', payload);
  },

  // GET /bills/me — paginated history
  getHistory: async () => {
    if (MOCK) {
      await delay(600);
      return {
        data: [
          { id: 'bh1', category: BILL_CATEGORY.AIRTIME, billerName: 'MTN Airtime', amount: '500.00',  status: 'SUCCESSFUL', createdAt: new Date(Date.now() - 86400000).toISOString() },
          { id: 'bh2', category: BILL_CATEGORY.MOBILE_DATA, billerName: 'Airtel 2GB', amount: '1500.00', status: 'SUCCESSFUL', createdAt: new Date(Date.now() - 172800000).toISOString() },
        ],
        meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
      };
    }
    return api.get('/bills/me');
  },

  // GET /bills/:reference
  getByReference: async (reference) => {
    if (MOCK) {
      await delay(400);
      return { reference, status: 'SUCCESSFUL' };
    }
    return api.get('/bills/' + reference);
  },

  // POST /bills/:reference/refresh-status — force refresh a stuck payment
  refreshStatus: async (reference) => {
    if (MOCK) {
      await delay(600);
      return { reference, status: 'SUCCESSFUL' };
    }
    return api.post('/bills/' + reference + '/refresh-status', {});
  },
};
