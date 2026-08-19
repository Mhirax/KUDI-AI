import { api } from './client';
import { pendingEndpoint } from './pending';

// ─── PROFILE API ──────────────────────────────────────────────────────────────
// Mixed: the profile read is LIVE; notifications and profile updates are not.

export const profileApi = {

  // GET /users/me  (AUTH REQUIRED) — LIVE
  // Returns UserResponseDto: firstName/lastName separate, no fullName field.
  getProfile: () => api.get('/users/me'),

  // ── PENDING ────────────────────────────────────────────────────────────────
  // There is no PUT /users/me. This previously mutated a local mock object and
  // returned success even with mock mode off — silent data loss, the user
  // believed their changes had saved. Now it fails loudly.
  updateProfile: pendingEndpoint('identity', 'PUT /users/me'),

  // No `notifications` backend module exists. Four fake notifications —
  // including invented transfer and salary amounts — were previously
  // hardcoded here. Removed.
  getNotifications: pendingEndpoint('notifications', 'GET /notifications/me'),
  getUnreadCount:   pendingEndpoint('notifications', 'GET /notifications/me/unread-count'),
  markRead:         pendingEndpoint('notifications', 'POST /notifications/:id/read'),
  markAllRead:      pendingEndpoint('notifications', 'POST /notifications/read-all'),
};
