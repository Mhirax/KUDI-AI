import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { accountsApi } from '@/api/accounts';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from './components/AuthLayout';
import AuthButton from './components/AuthButton';
import './Login.scss';

// REBUILT — backend has no phone/OTP/PIN auth. Real flow is email + password,
// returning tokens directly from POST /auth/login. See AuthResponseDto in
// the handover doc: { accessToken, refreshToken, accessTokenExpiresIn, user }.

export default function Login() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const setToken = useAuthStore((s) => s.setToken);
  const setRefreshToken = useAuthStore((s) => s.setRefreshToken);

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors]       = useState({});

  function validate() {
    const e = {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      e.email = 'Enter a valid email address';
    }
    if (!password) {
      e.password = 'Enter your password';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      // POST /auth/login -> AuthResponseDto
      const response = await authApi.login({ email: email.trim(), password });
      setUser(response.user);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);

      // Every user needs at least one account. Create the primary WALLET
      // silently on first login so Dashboard never hits an empty state.
      try {
        const accounts = await accountsApi.getMyAccounts();
        if (!accounts || accounts.length === 0) {
          await accountsApi.createAccount({ accountType: 'WALLET' });
        }
      } catch (accountErr) {
        console.error('Account provisioning failed:', accountErr);
      }

      // No OTP, no PIN — go straight to the dashboard.
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Kudi AI account">
      <div className="login">

        <div className="login__field">
          <label className="login__label">Email</label>
          <input
            className={'login__input' + (errors.email ? ' has-error' : '')}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && <p className="login__error">{errors.email}</p>}
        </div>

        <div className="login__field">
          <label className="login__label">Password</label>
          <input
            className={'login__input' + (errors.password ? ' has-error' : '')}
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />
          {errors.password && <p className="login__error">{errors.password}</p>}
        </div>

        {errors.general && (
          <div className="login__alert">
            <span>⚠</span> {errors.general}
          </div>
        )}

        <div className="login__footer">
          <AuthButton
            onClick={handleSubmit}
            disabled={!email || !password || isLoading}
            loading={isLoading}
          >
            Log In
          </AuthButton>
          <p className="login__signup-link">
            New to Kudi AI? <Link to="/signup">Create account</Link>
          </p>
        </div>

      </div>
    </AuthLayout>
  );
}
