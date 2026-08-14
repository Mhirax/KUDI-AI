import { useRef } from 'react';
import './OtpInput.scss';

const OTP_LENGTH = 6;

export default function OtpInput({ value, onChange, disabled = false, error = '' }) {
  const inputs = useRef([]);

  function handleChange(e, index) {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const newValue = value.split('');
    newValue[index] = digit;
    const joined = newValue.join('');
    onChange(joined);

    // Auto-advance to next field
    if (digit && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(e, index) {
    // Move back on backspace if current field is empty
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(pasted);
    // Focus last filled or end
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputs.current[focusIndex]?.focus();
  }

  return (
    <div className="otp-input">
      <div className="otp-input__boxes">
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            className={`otp-input__box ${error ? 'has-error' : ''} ${value[i] ? 'filled' : ''}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            disabled={disabled}
            autoComplete="one-time-code"
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>
      {error && <p className="otp-input__error">{error}</p>}
    </div>
  );
}
