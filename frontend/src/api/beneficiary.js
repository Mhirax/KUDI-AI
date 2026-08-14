import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

let MOCK_BENEFICIARIES = [
  { id: 'ben_001', accountName: 'Mama Tunde',     accountNumber: '0123456789', bankCode: '058', bankName: 'GTBank',  initials: 'MT' },
  { id: 'ben_002', accountName: 'Chidi Okeke',    accountNumber: '0987654321', bankCode: '033', bankName: 'UBA',     initials: 'CO' },
  { id: 'ben_003', accountName: 'Aisha Mohammed', accountNumber: '1234567890', bankCode: '011', bankName: 'First Bank', initials: 'AM' },
];

export const beneficiaryApi = {

  // GET /beneficiaries
  getAll: async () => {
    if (MOCK) {
      await delay();
      return [...MOCK_BENEFICIARIES];
    }
    return api.get('/beneficiaries');
  },

  // POST /beneficiaries
  save: async (payload) => {
    if (MOCK) {
      await delay();
      const newBen = {
        id:            'ben_' + Date.now(),
        accountName:   payload.accountName,
        accountNumber: payload.accountNumber,
        bankCode:      payload.bankCode,
        bankName:      payload.bankName,
        initials:      payload.accountName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      };
      MOCK_BENEFICIARIES = [newBen, ...MOCK_BENEFICIARIES];
      return newBen;
    }
    return api.post('/beneficiaries', payload);
  },

  // DELETE /beneficiaries/:id
  remove: async (id) => {
    if (MOCK) {
      await delay(300);
      MOCK_BENEFICIARIES = MOCK_BENEFICIARIES.filter((b) => b.id !== id);
      return { success: true };
    }
    return api.delete('/beneficiaries/' + id);
  },
};
