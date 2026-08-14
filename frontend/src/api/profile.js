import { api } from './client';

// UPDATED — profile data now comes from the Identity module's GET /users/me
// (UserResponseDto: firstName/lastName separate, no fullName). Notifications
// now come from the Notifications module (Section 3.8 of the handover doc).
// KYC status moved to its own file — src/api/kyc.js.

const MOCK = import.meta.env.VITE_MOCK_API === 'true';
const delay = (ms = 600) => new Promise((r) => setTimeout(r, ms));

const MOCK_PROFILE = {
  id:          'usr_mock_001',
  email:       'sarah@example.com',
  phoneNumber: '+2348012345678',
  firstName:   'Sarah',
  lastName:    'Adeyemi',
  role:        'USER',
  status:      'ACTIVE',
  lastLoginAt: new Date().toISOString(),
  createdAt:   '2024-01-15T10:30:00.000Z',
};

const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Transfer Successful',  body: 'You sent ₦2,000 to Mama Tunde',       read: false, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 'n2', title: 'Salary Received',      body: 'Credit of ₦80,000 to your wallet',    read: false, timestamp: new Date(Date.now() - 10800000).toISOString() },
  { id: 'n3', title: 'Airtime Purchase',     body: 'MTN ₦500 airtime purchase successful', read: true,  timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n4', title: 'Security Alert',       body: 'New device login detected',            read: true,  timestamp: new Date(Date.now() - 172800000).toISOString() },
];

export const profileApi = {

  // GET /users/me  (AUTH REQUIRED)
  getProfile: async () => {
    if (MOCK) {
      await delay();
      return { ...MOCK_PROFILE };
    }
    return api.get('/users/me');
  },

  // No PUT /users/me documented yet — kept as local mock only.
  updateProfile: async (payload) => {
    if (MOCK) {
      await delay(800);
      Object.assign(MOCK_PROFILE, payload);
      return { ...MOCK_PROFILE };
    }
    // Not in the confirmed backend endpoint list yet — fail soft.
    Object.assign(MOCK_PROFILE, payload);
    return { ...MOCK_PROFILE };
  },

  // GET /notifications/me  (AUTH REQUIRED) — supports ?unreadOnly=true
  getNotifications: async ({ unreadOnly = false } = {}) => {
    if (MOCK) {
      await delay(400);
      return unreadOnly ? MOCK_NOTIFICATIONS.filter((n) => !n.read) : [...MOCK_NOTIFICATIONS];
    }
    const response = await api.get('/notifications/me' + (unreadOnly ? '?unreadOnly=true' : ''));
    return response.data ?? response;
  },

  // GET /notifications/me/unread-count  (AUTH REQUIRED) — { unread: 5 }
  // Poll this to update the bell badge.
  getUnreadCount: async () => {
    if (MOCK) {
      await delay(200);
      return { unread: MOCK_NOTIFICATIONS.filter((n) => !n.read).length };
    }
    return api.get('/notifications/me/unread-count');
  },

  // POST /notifications/:id/read  (AUTH REQUIRED)
  markRead: async (notificationId) => {
    if (MOCK) {
      await delay(200);
      const n = MOCK_NOTIFICATIONS.find((x) => x.id === notificationId);
      if (n) n.read = true;
      return { success: true };
    }
    return api.post('/notifications/' + notificationId + '/read', {});
  },

  // POST /notifications/read-all  (AUTH REQUIRED) — { markedRead: 8 }
  markAllRead: async () => {
    if (MOCK) {
      await delay(300);
      const count = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;
      MOCK_NOTIFICATIONS.forEach((n) => (n.read = true));
      return { markedRead: count };
    }
    return api.post('/notifications/read-all', {});
  },
};
