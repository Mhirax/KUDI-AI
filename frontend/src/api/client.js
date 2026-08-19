// ─── KUDI AI API CLIENT ───────────────────────────────────────────────────────
// This is the single function that handles ALL communication with the backend.
// Every feature calls this — never use raw fetch() in a component directly.
//
// When the backend dev hands over his base URL:
//   1. Set VITE_API_BASE_URL in your .env file
//   2. Nothing else changes — every component already uses this client

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1';

// ── Token helpers ─────────────────────────────────────────────────────────────
// Tokens live in memory only — never localStorage
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

// ── Core client ───────────────────────────────────────────────────────────────
export async function apiClient(endpoint, options = {}) {
  const wasAuthenticated = !!accessToken;
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // A 401 on a request that carried a token means that token expired or was
  // revoked — that's a real session expiry. A 401 on a request with no token
  // (e.g. POST /auth/login with the wrong password) just means the backend
  // rejected the credentials, and must fall through to the normal error
  // handling below so the real backend message reaches the caller instead of
  // a misleading "session expired".
  if (response.status === 401 && wasAuthenticated) {
    clearAccessToken();
    // Redirect to login — router will handle this via protected routes
    window.dispatchEvent(new Event('auth:expired'));
    throw new Error('Session expired. Please log in again.');
  }

  // 204 No Content (logout, change-password) — no body to parse
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    // Backend error envelopes are inconsistent: DomainException gives a flat
    // string `message`, but plain NestJS HttpExceptions (e.g. ServiceUnavailable)
    // nest it as { message, error, statusCode }. Handle both.
    const backendMessage = typeof data.message === 'string' ? data.message : data.message?.message;
    throw new Error(backendMessage || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Convenience methods ───────────────────────────────────────────────────────
export const api = {
  get:    (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' }),
  post:   (endpoint, body, options = {}) => apiClient(endpoint, { ...options, method: 'POST', body }),
  put:    (endpoint, body, options = {}) => apiClient(endpoint, { ...options, method: 'PUT', body }),
  patch:  (endpoint, body, options = {}) => apiClient(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' }),
};
