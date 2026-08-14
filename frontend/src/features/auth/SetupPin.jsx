import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
import AuthLayout from './components/AuthLayout';
import PinPad from './components/PinPad';
import './SetupPin.scss';

const STEPS = {
  ENTER:   'enter',    // user sets their PIN
  CONFIRM: 'confirm',  // user confirms the same PIN
};

export default function SetupPin() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { phone, flow } = location.state || {};

  const { setUser, setToken } = useAuthStore();

  const [step, setStep]           = useState(STEPS.ENTER);
  const [pin, setPin]             = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const isConfirmStep = step === STEPS.CONFIRM;
  const currentPin    = isConfirmStep ? confirmPin : pin;

  function handlePinChange(value) {
    setError('');
    if (isConfirmStep) {
      setConfirmPin(value);
      if (value.length === 6) handleConfirmComplete(value);
    } else {
      setPin(value);
      if (value.length === 6) {
        // Move to confirm step
        setStep(STEPS.CONFIRM);
      }
    }
  }

  async function handleConfirmComplete(confirmedPin) {
    if (confirmedPin !== pin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      setStep(STEPS.ENTER);
      setPin('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.setPin({ phone, pin: confirmedPin });
      // Backend returns user object and token after PIN is set
      setUser(response.user);
      setToken(response.accessToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not set PIN. Please try again.');
      setConfirmPin('');
      setPin('');
      setStep(STEPS.ENTER);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title={isConfirmStep ? 'Confirm your PIN' : 'Create your PIN'}
      subtitle={
        isConfirmStep
          ? 'Enter your PIN once more to confirm'
          : 'Choose a 6-digit PIN to secure your account'
      }
      showBack={!isConfirmStep}
    >
      <div className="setup-pin">

        <div className="setup-pin__step-indicator">
          <div className={`setup-pin__step ${!isConfirmStep ? 'active' : 'done'}`}>
            <span>{!isConfirmStep ? '1' : '✓'}</span>
            <p>Set PIN</p>
          </div>
          <div className="setup-pin__step-line" />
          <div className={`setup-pin__step ${isConfirmStep ? 'active' : ''}`}>
            <span>2</span>
            <p>Confirm</p>
          </div>
        </div>

        <PinPad
          value={currentPin}
          onChange={handlePinChange}
          maxLength={6}
          disabled={isLoading}
        />

        {error && (
          <p className="setup-pin__error">⚠ {error}</p>
        )}

      </div>
    </AuthLayout>
  );
}
