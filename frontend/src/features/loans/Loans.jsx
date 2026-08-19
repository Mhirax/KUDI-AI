import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loansApi } from '@/api/loans';
import { isPendingError } from '@/api/pending';
import PendingFeature from '@/components/common/PendingFeature';
import { formatNaira } from '@/utils/format';
import './Loans.scss';

export default function Loans() {
  const navigate = useNavigate();
  const [offers,  setOffers]  = useState([]);
  const [active,  setActive]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [amount,  setAmount]  = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isPending, setPending] = useState(false);
  const [result,  setResult]  = useState(null);

  useEffect(() => {
    loansApi.getOffers()
      .then(setOffers)
      .catch((err) => { if (isPendingError(err)) setPending(true); });
    loansApi.getActive()
      .then(setActive)
      .catch(() => { /* pending state is driven by getOffers above */ });
  }, []);

  async function handleApply() {
    if (!selected || !amount) return;
    setLoading(true);
    try {
      const res = await loansApi.apply({ offerId: selected.id, amountKobo: Math.round(parseFloat(amount) * 100) });
      setResult(res);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="loans-screen">
        <div className="loans-screen__header">
          <button className="loans-screen__back" onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2>Loan Application</h2>
          <div style={{ width: 40 }} />
        </div>
        <div className="loans-screen__result">
          <div className="loans-screen__result-icon">📋</div>
          <h3>Application Submitted</h3>
          <p>{result.message}</p>
          <button className="loans-screen__btn" onClick={() => navigate('/dashboard')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="loans-screen">
      <div className="loans-screen__header">
        <button className="loans-screen__back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>Loans</h2>
        <div style={{ width: 40 }} />
      </div>

      {isPending ? (
        <PendingFeature
          title="Loans"
          module="loans"
          note="Loan offers, rates and tenors must come from the backend — showing invented credit terms is a compliance risk, not just a UX one."
        />
      ) : (
      <div className="loans-screen__body">
        <p className="loans-screen__section-title">Available Offers</p>
        {offers.map((offer) => (
          <div
            key={offer.id}
            className={'loans-screen__offer' + (selected?.id === offer.id ? ' active' : '')}
            onClick={() => setSelected(offer)}
          >
            <div className="loans-screen__offer-top">
              <h4>{offer.name}</h4>
              <span>{offer.interestRate}% interest</span>
            </div>
            <p className="loans-screen__offer-desc">{offer.description}</p>
            <p className="loans-screen__offer-max">Up to {formatNaira(offer.maxAmountKobo)} · {offer.tenorDays} days</p>
          </div>
        ))}

        {selected && (
          <div className="loans-screen__apply-form">
            <p className="loans-screen__section-title">How Much Do You Need?</p>
            <input
              className="loans-screen__input"
              type="number"
              placeholder="Amount in NGN"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button className="loans-screen__btn" onClick={handleApply} disabled={isLoading || !amount}>
              {isLoading ? 'Submitting…' : 'Apply Now'}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
