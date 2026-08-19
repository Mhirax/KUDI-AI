import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

import SplashScreen   from '@/features/onboarding/SplashScreen';
import OnboardingFlow from '@/features/onboarding/OnboardingFlow';
import LanguageSelect from '@/features/onboarding/LanguageSelect';
import PersonaSelect  from '@/features/onboarding/PersonaSelect';

import Login     from '@/features/auth/Login';
import Signup    from '@/features/auth/Signup';
// VerifyOtp and SetupPin stay in the codebase (kept for possible future use)
// but are DEACTIVATED — no OTP/PIN endpoints exist on the backend. Login now
// goes straight to /dashboard on success.

import AppShell   from '@/components/common/AppShell';
import Dashboard  from '@/features/dashboard/Dashboard';
import Cards      from '@/features/cards/Cards';
import Loans      from '@/features/loans/Loans';
import Rewards    from '@/features/rewards/Rewards';
import Profile    from '@/features/profile/Profile';
import Transfer   from '@/features/transfer/Transfer';
import Bills      from '@/features/bills/Bills';
import Savings    from '@/features/savings/Savings';
import Kyc        from '@/features/kyc/Kyc';

function ProtectedRoute({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (isLoggedIn) return <Navigate to="/dashboard" replace />;
  return children;
}

// NEW — listens for the 'auth:expired' event dispatched by apiClient.js on a
// 401 response, and tries a silent refresh (POST /auth/refresh) instead of
// immediately logging the user out. Only forces logout + redirect if the
// refresh itself fails (refreshToken expired after 7 days).
function AuthExpiredHandler() {
  const navigate = useNavigate();
  const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);

  useEffect(() => {
    async function handleExpired() {
      const ok = await refreshAccessToken();
      if (!ok) navigate('/login', { replace: true });
    }
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [refreshAccessToken, navigate]);

  return null;
}

// Runs once on app start: if a session was persisted from a previous visit
// (see authStore's `persist` config), silently exchange the stored
// refreshToken for a fresh accessToken before any protected route renders —
// otherwise a reload would show a flash of unauthenticated API calls.
function useAuthBootstrap() {
  const [ready, setReady] = useState(false);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hasRefreshToken = useAuthStore((s) => !!s.refreshToken);

  useEffect(() => {
    if (!hasRefreshToken) {
      setReady(true);
      return;
    }
    bootstrap().finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready;
}

function AppRoutes() {
  const ready = useAuthBootstrap();

  if (!ready) {
    // Session is being silently restored from a previous visit — render
    // nothing rather than flashing /login before we know the real state.
    return null;
  }

  return (
    <>
      <AuthExpiredHandler />
      <Routes>
        <Route path="/"                element={<SplashScreen />} />
        <Route path="/onboarding"      element={<OnboardingFlow />} />
        <Route path="/select-language" element={<LanguageSelect />} />
        <Route path="/select-persona"  element={<PersonaSelect />} />

        <Route path="/login"      element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup"     element={<PublicRoute><Signup /></PublicRoute>} />

        <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cards"     element={<Cards />} />
          <Route path="loans"     element={<Loans />} />
          <Route path="rewards"   element={<Rewards />} />
          <Route path="profile"   element={<Profile />} />
          <Route path="transfer"  element={<Transfer />} />
          <Route path="bills"     element={<Bills />} />
          <Route path="bills/airtime" element={<Bills />} />
          <Route path="savings"   element={<Savings />} />
          <Route path="kyc"       element={<Kyc />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}