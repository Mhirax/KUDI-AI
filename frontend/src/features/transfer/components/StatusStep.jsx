import { formatNaira, formatNairaDecimal } from '@/utils/format';
import { TX_STATUS } from '@/api/transfer';
import './StatusStep.scss';

// FIX 1 (carried over): All status checks use TX_STATUS constants that match
// the backend enum exactly (uppercase). Never hardcode status strings.
// UPDATED: result.amount / result.fee now come back as decimal strings from
// TransferResponseDto — use formatNairaDecimal for those, formatNaira only
// for the still-in-kobo amountKobo used during the pending/loading state.

export default function StatusStep({ isLoading, result, recipient, amountKobo, onDone, onRetry }) {

  // Still loading OR no result yet — show spinner
  if (isLoading || !result) {
    return (
      <div className="status-step">
        <div className="status-step__pending">
          <div className="status-step__spinner-ring" />
          <h3>Processing Transfer</h3>
          <p>Sending {formatNaira(amountKobo)} to {recipient?.accountName?.split(' ')[0]}…</p>
          <span>This usually takes a few seconds</span>
        </div>
      </div>
    );
  }

  if (result.status === TX_STATUS.SUCCESSFUL) {
    const displayAmount = result.amount ? formatNairaDecimal(result.amount) : formatNaira(amountKobo);
    return (
      <div className="status-step">
        <div className="status-step__result success">
          <div className="status-step__icon success">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Transfer Successful!</h3>
          <p>{displayAmount}</p>
          <span>Sent to {recipient?.accountName}</span>

          <div className="status-step__receipt">
            <div className="status-step__receipt-row">
              <span>Reference</span>
              <strong>{result.reference || 'KDI_' + Date.now()}</strong>
            </div>
            {result.fee && (
              <div className="status-step__receipt-row">
                <span>Fee</span>
                <strong>{formatNairaDecimal(result.fee)}</strong>
              </div>
            )}
            <div className="status-step__receipt-row">
              <span>Bank</span>
              <strong>{recipient?.bankName}</strong>
            </div>
            <div className="status-step__receipt-row">
              <span>Account</span>
              <strong>{recipient?.accountNumber}</strong>
            </div>
          </div>

          <button className="status-step__btn" onClick={onDone}>Back to Home</button>
        </div>
      </div>
    );
  }

  // FAILED, REVERSED, CANCELLED — all show the failure screen
  return (
    <div className="status-step">
      <div className="status-step__result failed">
        <div className="status-step__icon failed">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>Transfer Failed</h3>
        <p>{result.reason || 'Something went wrong. Please try again.'}</p>

        <div className="status-step__actions">
          <button className="status-step__btn secondary" onClick={onDone}>Go Home</button>
          <button className="status-step__btn" onClick={onRetry}>Try Again</button>
        </div>
      </div>
    </div>
  );
}
