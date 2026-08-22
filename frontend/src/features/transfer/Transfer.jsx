import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferApi, TX_STATUS } from '@/api/transfer';
import { beneficiaryApi } from '@/api/beneficiary';
import { accountsApi } from '@/api/accounts';
import RecipientStep from './components/RecipientStep';
import AmountStep    from './components/AmountStep';
import ConfirmStep   from './components/ConfirmStep';
import StatusStep    from './components/StatusStep';
import './Transfer.scss';

const STEPS = ['recipient', 'amount', 'confirm', 'status'];

// UPDATED — external transfers require sourceAccountId (the user's own
// account UUID, loaded from GET /accounts/me on mount) and send amount as a
// decimal string '1500.00' instead of a kobo integer. Polling now uses
// GET /transfers/:reference.

export default function Transfer() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState('recipient');
  const [recipient,  setRecipient]  = useState(null);
  const [amountKobo, setAmountKobo] = useState(0);
  const [note,       setNote]       = useState('');
  const [txResult,   setTxResult]   = useState(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState(null);

  // One idempotency key per user intent, NOT per request — a retry of the
  // same transfer must carry the same key. Reset only when the user starts a
  // new transfer. The backend honours this header (shared/idempotency/) —
  // a retried submit replays the original transfer's result rather than
  // creating a second one.
  const idempotencyKeyRef = useRef(null);

  useEffect(() => {
    accountsApi.getMyAccounts()
      .then((accounts) => setSourceAccountId(accounts?.[0]?.id ?? null))
      .catch(() => setSourceAccountId(null));
  }, []);

  function goTo(s) { setStep(s); }

  function handleRecipientSelected(r) {
    setRecipient(r);
    goTo('amount');
  }

  function handleAmountConfirmed(kobo, noteText) {
    setAmountKobo(kobo);
    setNote(noteText);
    goTo('confirm');
  }

  async function handleSubmitTransfer() {
    if (!sourceAccountId) {
      setTxResult({ status: TX_STATUS.FAILED, reason: 'No account found. Please try again.' });
      goTo('status');
      return;
    }

    setIsLoading(true);
    goTo('status');

    try {
      // Decimal string amount, not kobo integer.
      const amount = (amountKobo / 100).toFixed(2);

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      const result = await transferApi.initiateExternal({
        sourceAccountId,
        bankCode:              recipient.bankCode,
        recipientAccountNumber: recipient.accountNumber,
        recipientAccountName:   recipient.accountName,
        amount,
        narration: note,
        idempotencyKey: idempotencyKeyRef.current,
      });

      await pollStatus(result.reference, result);
    } catch (err) {
      setTxResult({ status: TX_STATUS.FAILED, reason: err.message });
      setIsLoading(false);
    }
  }

  async function pollStatus(reference, initialResult) {
    const maxPolls = 15;
    let polls = 0;

    // Poll every 3s per handover doc (external transfers resolve via
    // Flutterwave webhook, not instantly).
    const interval = setInterval(async () => {
      polls++;
      try {
        const statusResult = await transferApi.getByReference(reference);

        if (statusResult.status === TX_STATUS.SUCCESSFUL) {
          clearInterval(interval);
          setTxResult({ ...initialResult, ...statusResult, status: TX_STATUS.SUCCESSFUL });
          setIsLoading(false);

          // Auto-save recipient as beneficiary — silent, not critical
          await beneficiaryApi.save({
            accountName:   recipient.accountName,
            accountNumber: recipient.accountNumber,
            bankCode:      recipient.bankCode,
            bankName:      recipient.bankName,
          }).catch(() => {});

        } else if (statusResult.status === TX_STATUS.FAILED ||
                   statusResult.status === TX_STATUS.REVERSED ||
                   statusResult.status === TX_STATUS.CANCELLED) {
          clearInterval(interval);
          setTxResult({ ...initialResult, ...statusResult, status: TX_STATUS.FAILED, reason: statusResult.reason });
          setIsLoading(false);

        } else if (polls >= maxPolls) {
          // PENDING or PROCESSING for too long — timeout
          clearInterval(interval);
          setTxResult({
            ...initialResult,
            status: TX_STATUS.FAILED,
            reason: 'Transfer is taking longer than expected. Check your transaction history.',
          });
          setIsLoading(false);
        }
        // PENDING and PROCESSING — keep polling, do nothing this tick

      } catch {
        clearInterval(interval);
        setTxResult({
          ...initialResult,
          status: TX_STATUS.FAILED,
          reason: 'Could not confirm transfer status.',
        });
        setIsLoading(false);
      }
    }, 3000);
  }

  const stepIndex = STEPS.indexOf(step);
  const showBack  = step !== 'status';

  return (
    <div className="transfer">
      <div className="transfer__header">
        {showBack && (
          <button className="transfer__back" onClick={() => {
            if (step === 'recipient') navigate(-1);
            else if (step === 'amount')  goTo('recipient');
            else if (step === 'confirm') goTo('amount');
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h2 className="transfer__title">
          {step === 'recipient' && 'Send Money'}
          {step === 'amount'    && 'Enter Amount'}
          {step === 'confirm'   && 'Confirm Transfer'}
          {step === 'status'    && 'Transfer Status'}
        </h2>
        <div style={{ width: 40 }} />
      </div>

      {step !== 'status' && (
        <div className="transfer__progress">
          {['recipient', 'amount', 'confirm'].map((s, i) => (
            <div key={s} className={'transfer__progress-step' + (stepIndex >= i ? ' active' : '')} />
          ))}
        </div>
      )}

      {step === 'recipient' && <RecipientStep onSelect={handleRecipientSelected} />}
      {step === 'amount'    && <AmountStep recipient={recipient} onNext={handleAmountConfirmed} />}
      {step === 'confirm'   && (
        <ConfirmStep
          recipient={recipient}
          amountKobo={amountKobo}
          note={note}
          onConfirm={handleSubmitTransfer}
          onEdit={() => goTo('amount')}
        />
      )}
      {step === 'status' && (
        <StatusStep
          isLoading={isLoading}
          result={txResult}
          recipient={recipient}
          amountKobo={amountKobo}
          onDone={() => navigate('/dashboard')}
          onRetry={() => { setTxResult(null); goTo('confirm'); }}
        />
      )}
    </div>
  );
}
