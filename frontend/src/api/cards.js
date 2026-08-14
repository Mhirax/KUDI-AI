import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

let MOCK_CARDS = [
  {
    id:       'card_001',
    type:     'virtual',
    last4:    '3456',
    balance:  5000000,
    status:   'active',    // 'active' | 'frozen' | 'expired'
    expiryMonth: '12',
    expiryYear:  '26',
    brand:    'Visa',
  },
  {
    id:       'card_002',
    type:     'physical',
    last4:    '7891',
    balance:  0,
    status:   'pending',   // being delivered
    requestedAt: new Date(Date.now() - 432000000).toISOString(),
    brand:    'Visa',
  },
];

export const cardsApi = {

  // GET /cards
  getCards: async () => {
    if (MOCK) {
      await delay();
      return [...MOCK_CARDS];
    }
    return api.get('/cards');
  },

  // POST /cards/:id/freeze
  freeze: async (cardId) => {
    if (MOCK) {
      await delay(800);
      MOCK_CARDS = MOCK_CARDS.map((c) =>
        c.id === cardId ? { ...c, status: c.status === 'frozen' ? 'active' : 'frozen' } : c
      );
      return { success: true };
    }
    return api.post('/cards/' + cardId + '/freeze', {});
  },

  // POST /cards/request-physical
  requestPhysical: async () => {
    if (MOCK) {
      await delay(1000);
      const newCard = {
        id:          'card_' + Date.now(),
        type:        'physical',
        last4:       '0000',
        balance:     0,
        status:      'pending',
        requestedAt: new Date().toISOString(),
        brand:       'Visa',
      };
      MOCK_CARDS = [...MOCK_CARDS, newCard];
      return newCard;
    }
    return api.post('/cards/request-physical', {});
  },

  // POST /cards/:id/topup
  topUp: async (cardId, amountKobo) => {
    if (MOCK) {
      await delay(1000);
      MOCK_CARDS = MOCK_CARDS.map((c) =>
        c.id === cardId ? { ...c, balance: c.balance + amountKobo } : c
      );
      return { success: true };
    }
    return api.post('/cards/' + cardId + '/topup', { amountKobo });
  },
};
