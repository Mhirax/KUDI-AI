import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

let MOCK_SAVINGS = [
  { id: 'sav_001', name: 'Emergency Fund', targetKobo: 5000000,  savedKobo: 2000000, frequency: 'daily',   color: '#00D4C8' },
  { id: 'sav_002', name: 'Vacation',       targetKobo: 10000000, savedKobo: 1000000, frequency: 'weekly',  color: '#7B2FBE' },
  { id: 'sav_003', name: 'New Laptop',     targetKobo: 30000000, savedKobo: 8000000, frequency: 'monthly', color: '#4A6CF7' },
];

export const savingsApi = {

  // GET /savings
  getAll: async () => {
    if (MOCK) {
      await delay();
      return [...MOCK_SAVINGS];
    }
    return api.get('/savings');
  },

  // POST /savings
  create: async (payload) => {
    if (MOCK) {
      await delay();
      const newGoal = {
        id:          'sav_' + Date.now(),
        name:        payload.name,
        targetKobo:  payload.targetKobo,
        savedKobo:   0,
        frequency:   payload.frequency,
        color:       payload.color || '#00D4C8',
      };
      MOCK_SAVINGS = [newGoal, ...MOCK_SAVINGS];
      return newGoal;
    }
    return api.post('/savings', payload);
  },

  // POST /savings/:id/topup
  topUp: async (id, amountKobo) => {
    if (MOCK) {
      await delay(800);
      MOCK_SAVINGS = MOCK_SAVINGS.map((s) =>
        s.id === id ? { ...s, savedKobo: Math.min(s.savedKobo + amountKobo, s.targetKobo) } : s
      );
      return { success: true };
    }
    return api.post('/savings/' + id + '/topup', { amountKobo });
  },

  // DELETE /savings/:id
  remove: async (id) => {
    if (MOCK) {
      await delay(400);
      MOCK_SAVINGS = MOCK_SAVINGS.filter((s) => s.id !== id);
      return { success: true };
    }
    return api.delete('/savings/' + id);
  },
};
