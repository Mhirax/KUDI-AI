import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/api/auth';
import AuthLayout from './components/AuthLayout';
import OtpInput from './components/OtpInput';
import AuthButton from './components/AuthButton';
import './VerifyOtp.scss';

const RESEND_SECONDS = 60;

export default function VerifyOtp() {
  const navigate  = useNavigate();
  const location  = useLocation();

  // phone and flow ('login' | 'signup') passed from previous screen
  const { phone, fullName, flow } = location.state || {};

  const [otp, setOtp]             = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6) handleVerify();
  }, [otp]);

  async function handleVerify() {
    if (otp.length < 6) return;
    setIsLoading(true);
    setError('');

    try {
      await authApi.verifyOtp({ phone, otp });
      // Both flows go to PIN setup next
      navigate('/setup-pin', { state: { phone, fullName, flow } });
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setError('');
    try {
      await authApi.resendOtp({ phone });
      setCountdown(RESEND_SECONDS);
      setOtp('');
    } catch (err) {
      setError(err.message || 'Could not resend OTP.');
    } finally {
      setIsResending(false);
    }
  }

  // Mask phone for display: +234 801 ***5678
  const maskedPhone = phone
    ? phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, '$1 $2 ***$4')
    : '';

  return (
    <AuthLayout
      title="Verify your number"
      subtitle={`We sent a 6-digit code to ${maskedPhone}`}
    >
      <div className="verify-otp">

        <OtpInput
          value={otp}
          onChange={setOtp}
          disabled={isLoading}
          error={error}
        />

        {/* Resend section */}
        <div className="verify-otp__resend">
          {countdown > 0 ? (
            <p className="verify-otp__countdown">
              Resend code in <strong>{countdown}s</strong>
            </p>
          ) : (
            <button
              className="verify-otp__resend-btn"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? 'Sending…' : 'Resend OTP'}
            </button>
          )}
        </div>

        <div className="verify-otp__footer">
          <AuthButton
            onClick={handleVerify}
            disabled={otp.length < 6 || isLoading}
            loading={isLoading}
          >
            Verify
          </AuthButton>
        </div>

      </div>
    </AuthLayout>
  );
}
