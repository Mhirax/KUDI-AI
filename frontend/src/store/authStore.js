import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setAccessToken, clearAccessToken } from '@/api/client';
import { authApi } from '@/api/auth';

// Module-level (not store state) so concurrent callers — e.g. React 18
// StrictMode double-invoking the boot effect — share one in-flight request
// instead of racing two /auth/refresh calls against the same (single-use,
// rotated) refresh token, where the loser's early return could flip
// `ready` to true before the winner's response actually lands.
let refreshPromise = null;
let bootstrapPromise = null;

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
// Holds authentication state for the entire app.
// Every protected screen reads from here.
//
// UPDATED — user/isLoggedIn/refreshToken are now persisted to localStorage
// (via zustand's `persist`) so a page reload doesn't drop the session. The
// short-lived accessToken still lives only in client.js's in-memory variable
// (never localStorage) — on boot, `bootstrap()` exchanges the persisted
// refreshToken for a fresh accessToken before any protected screen renders.

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user:          null,     // user object from backend: { id, email, firstName, lastName, role, status }
      isLoggedIn:    false,
      isLoading:     false,
      error:         null,
      onboardingDone: false,   // has user completed onboarding screens
      selectedLang:  null,     // chosen language
      selectedPersona: null,   // chosen persona
      isRefreshing:  false,    // guards against concurrent refresh calls
      isBootstrapping: false,  // true while boot-time silent refresh is in flight
      refreshToken:  null,     // 7-day refresh token, persisted

      // Actions
      setUser: (user) => set({ user, isLoggedIn: true }),

      setToken: (token) => {
        setAccessToken(token);
      },

      setRefreshToken: (token) => set({ refreshToken: token }),

      getRefreshToken: () => get().refreshToken,

      // Calls POST /auth/refresh with the stored refreshToken, and on
      // success updates both tokens. apiClient.js's 'auth:expired' listener
      // (wired in AppRouter) calls this instead of immediately logging the
      // user out.
      refreshAccessToken: () => {
        if (refreshPromise) return refreshPromise;
        const refreshToken = get().refreshToken;
        if (!refreshToken) {
          get().logout();
          return Promise.resolve(false);
        }
        set({ isRefreshing: true });
        refreshPromise = authApi
          .refresh(refreshToken)
          .then((response) => {
            setAccessToken(response.accessToken);
            set({ refreshToken: response.refreshToken || refreshToken });
            return true;
          })
          .catch(() => {
            get().logout();
            return false;
          })
          .finally(() => {
            set({ isRefreshing: false });
            refreshPromise = null;
          });
        return refreshPromise;
      },

      // Runs once on app start. If a session was persisted from a previous
      // visit, silently exchanges the refreshToken for a fresh accessToken
      // so the app comes up already logged in instead of flashing /login.
      bootstrap: () => {
        if (bootstrapPromise) return bootstrapPromise;
        if (!get().refreshToken) return Promise.resolve();
        set({ isBootstrapping: true });
        bootstrapPromise = get()
          .refreshAccessToken()
          .finally(() => {
            set({ isBootstrapping: false });
            bootstrapPromise = null;
          });
        return bootstrapPromise;
      },

      logout: () => {
        clearAccessToken();
        set({ user: null, isLoggedIn: false, error: null, refreshToken: null });
      },

      setOnboardingDone: () => set({ onboardingDone: true }),
      setSelectedLang: (lang) => set({ selectedLang: lang }),
      setSelectedPersona: (persona) => set({ selectedPersona: persona }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'kudi-auth-storage',
      partialize: (state) => ({
        user:            state.user,
        isLoggedIn:      state.isLoggedIn,
        refreshToken:    state.refreshToken,
        onboardingDone:  state.onboardingDone,
        selectedLang:    state.selectedLang,
        selectedPersona: state.selectedPersona,
      }),
    },
  ),
);
