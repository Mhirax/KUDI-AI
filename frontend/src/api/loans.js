import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 700) => new Promise((r) => setTimeout(r, ms));

const MOCK_LOAN_OFFERS = [
  {
    id:             'offer_001',
    type:           'quick',
    name:           'Quick Loan',
    maxAmountKobo:  5000000,
    interestRate:   10,
    tenorDays:      30,
    description:    'Get up to ₦50,000 instantly with 10% interest.',
  },
  {
    id:             'offer_002',
    type:           'business',
    name:           'Business Loan',
    maxAmountKobo:  500000000,
    interestRate:   8,
    tenorDays:      90,
    description:    'Up to ₦5,000,000 for your business needs.',
  },
];

const MOCK_ACTIVE_LOANS = [];

export const loansApi = {

  // GET /loans/offers
  getOffers: async () => {
    if (MOCK) {
      await delay();
      return MOCK_LOAN_OFFERS;
    }
    return api.get('/loans/offers');
  },

  // GET /loans/active
  getActive: async () => {
    if (MOCK) {
      await delay(400);
      return MOCK_ACTIVE_LOANS;
    }
    return api.get('/loans/active');
  },

  // POST /loans/apply
  apply: async (payload) => {
    if (MOCK) {
      await delay(2000); // application takes time
      return {
        loanId:     'LN_' + Date.now(),
        status:     'under_review',
        amountKobo: payload.amountKobo,
        message:    'Your loan application is under review. You will be notified within 24 hours.',
      };
    }
    return api.post('/loans/apply', payload);
  },

  // POST /loans/:id/repay
  repay: async (loanId, amountKobo) => {
    if (MOCK) {
      await delay(1000);
      return { success: true, message: 'Repayment recorded successfully.' };
    }
    return api.post('/loans/' + loanId + '/repay', { amountKobo });
  },
};
