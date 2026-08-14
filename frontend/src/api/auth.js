import { api } from './client';

// ─── MOCK MODE ────────────────────────────────────────────────────────────────
// VITE_MOCK_API=true in .env enables mock responses so you can build and test
// the full UI without a running backend.
// When the backend dev's server is running locally:
//   1. Set VITE_MOCK_API=false in .env
//   2. Nothing else changes — every screen already works

const MOCK = import.meta.env.VITE_MOCK_API === 'true';

// Simulates network delay so loading states are visible
function mockDelay(ms = 800) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock user shaped like the real UserResponseDto — firstName/lastName
// separate, no fullName field.
const MOCK_USER = {
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

// ─── AUTH API ─────────────────────────────────────────────────────────────────
// All authentication calls live here. Endpoints confirmed against the
// Identity module (Section 3.1 of the handover doc).

export const authApi = {

  // POST /auth/register  (PUBLIC)
  // Body: { email, password, firstName, lastName, phoneNumber }
  // Returns: UserResponseDto (no tokens — user must log in separately)
  register: async (payload) => {
    if (MOCK) {
      await mockDelay();
      console.log('[MOCK] register →', payload);
      return { ...MOCK_USER, ...payload, id: 'usr_mock_' + Date.now() };
    }
    return api.post('/auth/register', payload);
  },

  // POST /auth/login  (PUBLIC)
  // Body: { email, password }
  // Returns: AuthResponseDto { accessToken, refreshToken, accessTokenExpiresIn, user }
  login: async (payload) => {
    if (MOCK) {
      await mockDelay();
      console.log('[MOCK] login →', payload);
      return {
        accessToken: 'mock_access_token_xyz',
        refreshToken: 'mock_refresh_token_xyz',
        accessTokenExpiresIn: 900, // 15 minutes, in seconds
        user: MOCK_USER,
      };
    }
    return api.post('/auth/login', payload);
  },

  // POST /auth/refresh  (PUBLIC)
  // Body: { refreshToken } — returns a new AuthResponseDto token pair
  refresh: async (refreshToken) => {
    if (MOCK) {
      await mockDelay(300);
      return {
        accessToken: 'mock_access_token_refreshed',
        refreshToken: 'mock_refresh_token_refreshed',
        accessTokenExpiresIn: 900,
        user: MOCK_USER,
      };
    }
    return api.post('/auth/refresh', { refreshToken });
  },

  // POST /auth/logout  (AUTH REQUIRED)
  // Body: { refreshToken } — returns 204 No Content
  logout: async (refreshToken) => {
    if (MOCK) {
      await mockDelay(300);
      return null;
    }
    return api.post('/auth/logout', { refreshToken });
  },

  // POST /auth/change-password  (AUTH REQUIRED)
  // Body: { currentPassword, newPassword } — returns 204 No Content
  changePassword: async (payload) => {
    if (MOCK) {
      await mockDelay(500);
      return null;
    }
    return api.post('/auth/change-password', payload);
  },

  // ── Legacy OTP/PIN mock functions ─────────────────────────────────────────
  // No OTP or PIN endpoints exist in the backend yet. VerifyOtp.jsx and
  // SetupPin.jsx are kept in the codebase but removed from the active router
  // (see AppRouter.jsx). These stay mock-only for possible future use.
  verifyOtp: async (payload) => {
    if (MOCK) {
      await mockDelay();
      if (payload.otp !== '123456') {
        throw new Error('Invalid OTP. Use 123456 in mock mode.');
      }
      return { message: 'OTP verified' };
    }
    throw new Error('OTP is not supported by the backend yet.');
  },

  resendOtp: async (payload) => {
    if (MOCK) {
      await mockDelay(500);
      return { message: 'OTP resent' };
    }
    throw new Error('OTP is not supported by the backend yet.');
  },

  setPin: async (payload) => {
    if (MOCK) {
      await mockDelay();
      return { user: MOCK_USER, accessToken: 'mock_token_xyz_123' };
    }
    throw new Error('PIN setup is not supported by the backend yet.');
  },

  verifyPin: async (payload) => {
    if (MOCK) {
      await mockDelay();
      return { user: MOCK_USER, accessToken: 'mock_token_xyz_123' };
    }
    throw new Error('PIN verification is not supported by the backend yet.');
  },
};
