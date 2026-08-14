import { useState } from 'react';
import { formatNaira } from '@/utils/format';
import './AmountStep.scss';

const QUICK_AMOUNTS = [500000, 1000000, 2000000, 5000000]; // kobo

export default function AmountStep({ recipient, onNext }) {
  const [rawAmount, setRawAmount] = useState('');
  const [note,      setNote]      = useState('');
  const [error,     setError]     = useState('');

  const amountKobo = Math.round(parseFloat(rawAmount || '0') * 100);

  function handleQuickAmount(kobo) {
    setRawAmount((kobo / 100).toString());
    setError('');
  }

  function handleNext() {
    if (!rawAmount || amountKobo <= 0) {
      setError('Enter an amount to send.');
      return;
    }
    if (amountKobo < 10000) { // minimum NGN 100
      setError('Minimum transfer amount is ₦100.');
      return;
    }
    setError('');
    onNext(amountKobo, note);
  }

  return (
    <div className="amount-step">

      {/* Recipient summary */}
      <div className="amount-step__recipient">
        <div className="amount-step__recipient-avatar">
          {recipient?.accountName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>
        <div className="amount-step__recipient-info">
          <p>{recipient?.accountName}</p>
          <span>{recipient?.bankName} · {recipient?.accountNumber}</span>
        </div>
      </div>

      {/* Amount input */}
      <div className="amount-step__input-wrap">
        <span className="amount-step__currency">₦</span>
        <input
          className="amount-step__input"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={rawAmount}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9.]/g, '');
            setRawAmount(val);
            setError('');
          }}
          autoFocus
        />
      </div>

      {error && <p className="amount-step__error">{error}</p>}

      {/* Quick amounts */}
      <div className="amount-step__quick">
        {QUICK_AMOUNTS.map((kobo) => (
          <button
            key={kobo}
            className="amount-step__quick-btn"
            onClick={() => handleQuickAmount(kobo)}
          >
            {formatNaira(kobo, { compact: true })}
          </button>
        ))}
      </div>

      {/* Note */}
      <div className="amount-step__note-wrap">
        <label>Note (optional)</label>
        <input
          className="amount-step__note"
          type="text"
          placeholder="What's this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
        />
      </div>

      <div className="amount-step__footer">
        <button
          className="amount-step__btn"
          onClick={handleNext}
          disabled={!rawAmount || amountKobo <= 0}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
