import { useState, useEffect } from 'react';
import { transferApi } from '@/api/transfer';
import { beneficiaryApi } from '@/api/beneficiary';
import './RecipientStep.scss';

// UPDATED — no /transfer/name-enquiry endpoint exists on the backend.
// The recipient's name is now typed manually and verified when the
// transfer is initiated (server-side), not looked up client-side.

export default function RecipientStep({ onSelect }) {
  const [banks,        setBanks]        = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName,   setAccountName]   = useState('');
  const [selectedBank,  setSelectedBank]  = useState('');
  const [error,         setError]         = useState('');

  useEffect(() => {
    transferApi.getBanks().then(setBanks);

    // No `beneficiaries` backend module yet. Degrade quietly: the saved-
    // recipients list is simply absent and manual entry below still works
    // against the real POST /transfers/external. See docs/API-CONTRACT.md.
    beneficiaryApi.getAll()
      .then(setBeneficiaries)
      .catch(() => setBeneficiaries([]));
  }, []);

  const isValid = accountNumber.length === 10 && selectedBank && accountName.trim().length > 1;

  function confirmRecipient() {
    setError('');
    if (!isValid) {
      setError('Fill in bank, account number and recipient name.');
      return;
    }
    const bankName = banks.find((b) => b.code === selectedBank)?.name || '';
    onSelect({ accountName: accountName.trim(), accountNumber, bankCode: selectedBank, bankName });
  }

  return (
    <div className="recipient-step">

      {/* Manual entry */}
      <div className="recipient-step__section">
        <p className="recipient-step__section-title">Enter Account Details</p>

        <div className="recipient-step__field">
          <label>Select Bank</label>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="recipient-step__select"
          >
            <option value="">Choose a bank…</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="recipient-step__field">
          <label>Account Number</label>
          <input
            className="recipient-step__input"
            type="text"
            inputMode="numeric"
            placeholder="10-digit account number"
            value={accountNumber}
            maxLength={10}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        <div className="recipient-step__field">
          <label>Recipient Name</label>
          <input
            className="recipient-step__input"
            type="text"
            placeholder="Full name on the account"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
          <p className="recipient-step__hint">No auto-lookup — double-check this matches the account.</p>
        </div>

        {error && <p className="recipient-step__error">⚠ {error}</p>}

        <button className="recipient-step__btn" onClick={confirmRecipient} disabled={!isValid}>
          Continue
        </button>
      </div>

      {/* Saved beneficiaries */}
      {beneficiaries.length > 0 && (
        <div className="recipient-step__section">
          <p className="recipient-step__section-title">Recent Recipients</p>
          <div className="recipient-step__beneficiaries">
            {beneficiaries.map((b) => (
              <button
                key={b.id}
                className="recipient-step__beneficiary"
                onClick={() => onSelect({ accountName: b.accountName, accountNumber: b.accountNumber, bankCode: b.bankCode, bankName: b.bankName })}
              >
                <div className="recipient-step__ben-avatar">{b.initials}</div>
                <div className="recipient-step__ben-info">
                  <p>{b.accountName}</p>
                  <span>{b.bankName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
