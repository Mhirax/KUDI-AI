import { create } from 'zustand';
import { setAccessToken, clearAccessToken } from '@/api/client';
import { authApi } from '@/api/auth';

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
// Holds authentication state for the entire app.
// Every protected screen reads from here.
//
// UPDATED — refreshToken now lives here alongside accessToken so the app can
// silently refresh instead of forcing a re-login every 15 minutes.
// accessToken itself stays out of Zustand state (client.js keeps it in a
// module-level variable, never localStorage) — only refreshToken is stored
// here because it's needed to call POST /auth/refresh.

let refreshTokenValue = null;

export const useAuthStore = create((set, get) => ({
  // State
  user:          null,     // user object from backend: { id, email, firstName, lastName, role, status }
  isLoggedIn:    false,
  isLoading:     false,
  error:         null,
  onboardingDone: false,   // has user completed onboarding screens
  selectedLang:  null,     // chosen language
  selectedPersona: null,   // chosen persona
  isRefreshing:  false,    // guards against concurrent refresh calls

  // Actions
  setUser: (user) => set({ user, isLoggedIn: true }),

  setToken: (token) => {
    setAccessToken(token);
  },

  // NEW — stores the refresh token (7-day lifespan) used to silently
  // renew the 15-minute access token.
  setRefreshToken: (token) => {
    refreshTokenValue = token;
  },

  getRefreshToken: () => refreshTokenValue,

  // NEW — calls POST /auth/refresh with the stored refreshToken, and on
  // success updates both tokens. apiClient.js's 'auth:expired' listener
  // (wired in AppRouter or a top-level effect) should call this instead
  // of immediately logging the user out.
  refreshAccessToken: async () => {
    if (get().isRefreshing) return false;
    if (!refreshTokenValue) {
      get().logout();
      return false;
    }
    set({ isRefreshing: true });
    try {
      const response = await authApi.refresh(refreshTokenValue);
      setAccessToken(response.accessToken);
      if (response.refreshToken) refreshTokenValue = response.refreshToken;
      set({ isRefreshing: false });
      return true;
    } catch (err) {
      set({ isRefreshing: false });
      get().logout();
      return false;
    }
  },

  logout: () => {
    clearAccessToken();
    refreshTokenValue = null;
    set({ user: null, isLoggedIn: false, error: null });
  },

  setOnboardingDone: () => set({ onboardingDone: true }),
  setSelectedLang: (lang) => set({ selectedLang: lang }),
  setSelectedPersona: (persona) => set({ selectedPersona: persona }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
