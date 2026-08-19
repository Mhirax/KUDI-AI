import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/api/auth';
import PhoneInput from './components/PhoneInput';
import AuthLayout from './components/AuthLayout';
import AuthButton from './components/AuthButton';
import './Signup.scss';

// REBUILT — backend register expects { email, password, firstName, lastName, phoneNumber }
// phoneNumber must be E.164: +2348012345678 (PhoneInput already collects the
// 10-digit local part, we just prefix +234 same as before).
// Password rule from backend: min 8 characters, no other constraints.
// POST /auth/register returns UserResponseDto (no tokens) — navigate to /login.

const PASSWORD_RULE = /^.{8,}$/;

export default function Signup() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors]       = useState({});

  function validate() {
    const e = {};
    if (!firstName.trim()) e.firstName = 'Enter your first name';
    if (!lastName.trim())  e.lastName = 'Enter your last name';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) e.email = 'Enter a valid email address';
    if (!phone || phone.length < 10) e.phone = 'Enter a valid 10-digit phone number';
    if (!PASSWORD_RULE.test(password)) {
      e.password = 'Min 8 characters';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsLoading(true);
    setErrors({});
    try {
      await authApi.register({
        email:       email.trim(),
        password,
        firstName:   firstName.trim(),
        lastName:    lastName.trim(),
        phoneNumber: '+234' + phone,   // E.164 format
      });
      navigate('/login');
    } catch (err) {
      setErrors({ general: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  const passwordStrength = password ? (PASSWORD_RULE.test(password) ? 'strong' : 'weak') : '';

  return (
    <AuthLayout title="Create your account" subtitle="Start banking smarter with Kudi AI">
      <div className="signup">

        <div className="signup__field">
          <label className="signup__label">First Name</label>
          <input
            className={'signup__input' + (errors.firstName ? ' has-error' : '')}
            type="text"
            placeholder="e.g. Chinedu"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            disabled={isLoading}
          />
          {errors.firstName && <p className="signup__error">{errors.firstName}</p>}
        </div>

        <div className="signup__field">
          <label className="signup__label">Last Name</label>
          <input
            className={'signup__input' + (errors.lastName ? ' has-error' : '')}
            type="text"
            placeholder="e.g. Okonkwo"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            disabled={isLoading}
          />
          {errors.lastName && <p className="signup__error">{errors.lastName}</p>}
        </div>

        <div className="signup__field">
          <label className="signup__label">Email</label>
          <input
            className={'signup__input' + (errors.email ? ' has-error' : '')}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
          />
          {errors.email && <p className="signup__error">{errors.email}</p>}
        </div>

        <PhoneInput
          value={phone}
          onChange={setPhone}
          disabled={isLoading}
          error={errors.phone}
        />

        <div className="signup__field">
          <label className="signup__label">Password</label>
          <input
            className={'signup__input' + (errors.password ? ' has-error' : '')}
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
          />
          {password && (
            <p className={'signup__strength ' + passwordStrength}>
              {passwordStrength === 'strong' ? '✓ Looks good' : 'Needs at least 8 characters'}
            </p>
          )}
          {errors.password && <p className="signup__error">{errors.password}</p>}
        </div>

        {errors.general && (
          <div className="signup__alert">
            <span>⚠</span> {errors.general}
          </div>
        )}

        <div className="signup__footer">
          <AuthButton
            onClick={handleSubmit}
            disabled={!firstName || !lastName || !email || !phone || !password || isLoading}
            loading={isLoading}
          >
            Continue
          </AuthButton>
          <p className="signup__login-link">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>

      </div>
    </AuthLayout>
  );
}
