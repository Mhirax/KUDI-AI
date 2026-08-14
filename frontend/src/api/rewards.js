import { api } from './client';

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const MOCK_REWARDS = {
  points: 2450,
  tier:   'Silver',
  redemptions: [
    { id: 'red_001', name: '₦500 Airtime',       pointsCost: 1000, type: 'airtime' },
    { id: 'red_002', name: '₦1,000 Data Bundle', pointsCost: 1800, type: 'data' },
    { id: 'red_003', name: 'Shopping Voucher',   pointsCost: 2000, type: 'voucher' },
    { id: 'red_004', name: '₦2,000 Cashback',   pointsCost: 3500, type: 'cashback' },
  ],
  history: [
    { id: 'rh1', description: 'Transfer bonus',    points: 50,  type: 'earned',   timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: 'rh2', description: 'Bill payment bonus', points: 25, type: 'earned',   timestamp: new Date(Date.now() - 172800000).toISOString() },
    { id: 'rh3', description: 'Airtime redeemed',  points: -1000, type: 'redeemed', timestamp: new Date(Date.now() - 259200000).toISOString() },
  ],
};

export const rewardsApi = {

  // GET /rewards
  getRewards: async () => {
    if (MOCK) {
      await delay();
      return { ...MOCK_REWARDS };
    }
    return api.get('/rewards');
  },

  // POST /rewards/redeem
  redeem: async (redemptionId) => {
    if (MOCK) {
      await delay(1000);
      const item = MOCK_REWARDS.redemptions.find((r) => r.id === redemptionId);
      if (!item) throw new Error('Redemption option not found.');
      if (MOCK_REWARDS.points < item.pointsCost) {
        throw new Error('Insufficient points for this redemption.');
      }
      MOCK_REWARDS.points -= item.pointsCost;
      return { success: true, pointsRemaining: MOCK_REWARDS.points };
    }
    return api.post('/rewards/redeem', { redemptionId });
  },
};
