import { useState } from 'react';
import { formatNairaDecimal } from '@/utils/format';
import './BalanceCard.scss';

// UPDATED — balance now arrives as a decimal string from GET /accounts/me
// (e.g. '5000.00'), not a kobo integer. Use formatNairaDecimal, no /100.
// The old "incoming" indicator had no backing field in AccountResponseDto
// so it's removed until a real source exists.

export default function BalanceCard({ balance, isLoading }) {
  const [hidden, setHidden] = useState(false);

  return (
    <div className="balance-card">
      <div className="balance-card__inner">

        {/* Top row */}
        <div className="balance-card__top">
          <p className="balance-card__label">Total Balance</p>
          <button
            className="balance-card__toggle"
            onClick={() => setHidden((h) => !h)}
            aria-label={hidden ? 'Show balance' : 'Hide balance'}
          >
            {hidden ? (
              // Eye off
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              // Eye on
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
              </svg>
            )}
          </button>
        </div>

        {/* Balance amount */}
        <div className="balance-card__amount">
          {isLoading ? (
            <div className="balance-card__skeleton" />
          ) : hidden ? (
            <span className="balance-card__hidden">₦ ••••••</span>
          ) : (
            <span>{formatNairaDecimal(balance)}</span>
          )}
        </div>

        {/* Bottom row */}
        <div className="balance-card__bottom">
          <div className="balance-card__available">
            <span className="balance-card__available-label">Available Balance</span>
          </div>
        </div>

      </div>

      {/* Decorative orbs */}
      <div className="balance-card__orb balance-card__orb--1" />
      <div className="balance-card__orb balance-card__orb--2" />
    </div>
  );
}
