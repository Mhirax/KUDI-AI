import './PhoneInput.scss';

export default function PhoneInput({ value, onChange, disabled = false, error = '' }) {
  return (
    <div className="phone-input">
      <label className="phone-input__label">Phone Number</label>
      <div className={`phone-input__row ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}>
        <div className="phone-input__prefix">
          <span className="phone-input__flag">🇳🇬</span>
          <span className="phone-input__code">+234</span>
        </div>
        <input
          className="phone-input__field"
          type="tel"
          inputMode="numeric"
          placeholder="801 234 5678"
          value={value}
          onChange={(e) => {
            // Strip non-numeric characters
            const cleaned = e.target.value.replace(/\D/g, '');
            onChange(cleaned);
          }}
          maxLength={10}
          disabled={disabled}
          autoComplete="tel"
        />
      </div>
      {error && <p className="phone-input__error">{error}</p>}
    </div>
  );
}
