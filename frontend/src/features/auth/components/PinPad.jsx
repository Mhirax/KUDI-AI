import './PinPad.scss';

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinPad({ value, onChange, maxLength = 6, disabled = false }) {

  function handleKey(key) {
    if (disabled) return;

    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '') return; // empty placeholder key
    if (value.length >= maxLength) return;

    onChange(value + key);
  }

  return (
    <div className="pin-pad">

      {/* PIN dots display */}
      <div className="pin-pad__dots" aria-label="PIN entry">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`pin-pad__dot ${i < value.length ? 'filled' : ''}`}
          />
        ))}
      </div>

      {/* Number keys */}
      <div className="pin-pad__keys">
        {KEYS.map((key, i) => (
          <button
            key={i}
            className={`pin-pad__key ${key === '⌫' ? 'backspace' : ''} ${key === '' ? 'empty' : ''}`}
            onClick={() => handleKey(key)}
            disabled={disabled || key === ''}
            aria-label={key === '⌫' ? 'Delete' : key}
          >
            {key}
          </button>
        ))}
      </div>

    </div>
  );
}
