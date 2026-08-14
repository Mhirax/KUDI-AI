import { formatNaira } from '@/utils/format';
import './ConfirmStep.scss';

// UPDATED — fee is no longer hardcoded (NGN 50 flat). The backend calculates
// the real fee and returns it on TransferResponseDto.fee, shown after
// initiation on the status/receipt screen instead.

export default function ConfirmStep({ recipient, amountKobo, note, onConfirm, onEdit }) {
  return (
    <div className="confirm-step">
      <div className="confirm-step__card">

        <div className="confirm-step__row">
          <span>To</span>
          <div className="confirm-step__recipient">
            <p>{recipient?.accountName}</p>
            <span>{recipient?.bankName} · {recipient?.accountNumber}</span>
          </div>
        </div>

        <div className="confirm-step__divider" />

        <div className="confirm-step__row">
          <span>Amount</span>
          <strong>{formatNaira(amountKobo)}</strong>
        </div>
        <div className="confirm-step__row">
          <span>Fee</span>
          <span className="confirm-step__fee-note">Calculated after confirmation</span>
        </div>

        {note && (
          <>
            <div className="confirm-step__divider" />
            <div className="confirm-step__row">
              <span>Note</span>
              <p className="confirm-step__note">{note}</p>
            </div>
          </>
        )}
      </div>

      <p className="confirm-step__disclaimer">
        Please verify the recipient details above. Transfers cannot be reversed once confirmed.
      </p>

      <div className="confirm-step__actions">
        <button className="confirm-step__edit" onClick={onEdit}>Edit</button>
        <button className="confirm-step__confirm" onClick={onConfirm}>Confirm Transfer</button>
      </div>
    </div>
  );
}
