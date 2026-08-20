import { api } from './client';
import { pendingEndpoint } from './pending';

// ─── AUTH API ─────────────────────────────────────────────────────────────────
// All five endpoints below are LIVE against the identity module.

export const authApi = {

  // POST /auth/register  (PUBLIC)
  // Body: { email, phoneNumber, password, firstName, lastName }
  // phoneNumber must be E.164, e.g. +2348012345678. Password min 10 chars, no other constraints.
  // Returns UserResponseDto — no tokens, the user logs in separately.
  register: (payload) => api.post('/auth/register', payload),

  // POST /auth/login  (PUBLIC)
  // Returns AuthResponseDto { accessToken, refreshToken, accessTokenExpiresIn, user }
  login: (payload) => api.post('/auth/login', payload),

  // POST /auth/refresh  (PUBLIC) — returns a new AuthResponseDto token pair
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),

  // POST /auth/logout  (AUTH REQUIRED) — 204 No Content
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),

  // POST /auth/change-password  (AUTH REQUIRED) — 204 No Content
  changePassword: (payload) => api.post('/auth/change-password', payload),

  // ── OTP / PIN — PENDING ────────────────────────────────────────────────────
  // The backend has no OTP or PIN endpoints. VerifyOtp.jsx and SetupPin.jsx
  // are not routed in AppRouter — they are dead screens pending a decision on
  // whether transaction PINs are in scope at all (see docs/AUDIT.md §5.8).
  verifyOtp: pendingEndpoint('identity', 'POST /auth/verify-otp'),
  resendOtp: pendingEndpoint('identity', 'POST /auth/resend-otp'),
  setPin:    pendingEndpoint('identity', 'POST /auth/pin'),
  verifyPin: pendingEndpoint('identity', 'POST /auth/pin/verify'),
};
