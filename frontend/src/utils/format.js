// ─── CURRENCY ─────────────────────────────────────────────────────────────────
// Two money formatters now exist — use the right one for the data source:
//
//   formatNaira(kobo)         — legacy: input is an INTEGER of kobo.
//                                Still used by screens still on mock kobo data
//                                (Cards, Savings, Loans, Rewards, Bills mocks,
//                                and the in-flight kobo amount inside Transfer
//                                before it's converted to a decimal string).
//
//   formatNairaDecimal(value) — NEW: input is the backend's DECIMAL STRING
//                                naira amount, e.g. '5000.00'. Used anywhere
//                                data comes straight from accounts/ledger/
//                                transfers/bills API responses. Does NOT
//                                divide by 100.

export function formatNaira(kobo, options = {}) {
  const { compact = false, showSymbol = true } = options;
  const naira = kobo / 100;
  return formatNairaAmount(naira, { compact, showSymbol });
}

export function formatNairaDecimal(value, options = {}) {
  const { compact = false, showSymbol = true } = options;
  const naira = typeof value === 'string' ? parseFloat(value) : value;
  return formatNairaAmount(naira || 0, { compact, showSymbol });
}

function formatNairaAmount(naira, { compact, showSymbol }) {
  if (compact && naira >= 1_000_000) {
    return (showSymbol ? '₦' : '') + (naira / 1_000_000).toFixed(1) + 'M';
  }
  if (compact && naira >= 1_000) {
    return (showSymbol ? '₦' : '') + (naira / 1_000).toFixed(1) + 'K';
  }

  return new Intl.NumberFormat('en-NG', {
    style:    showSymbol ? 'currency' : 'decimal',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

// ─── DATE / TIME ──────────────────────────────────────────────────────────────

export function formatTransactionTime(isoString) {
  const date = new Date(isoString);
  const now  = new Date();
  const diffMs = now - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return diffMins + 'm ago';
  if (diffHours < 24) return diffHours + 'h ago';

  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

// ─── INITIALS ─────────────────────────────────────────────────────────────────

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}
