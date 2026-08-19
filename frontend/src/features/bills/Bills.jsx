import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { billsApi, BILL_CATEGORY } from '@/api/bills';
import { accountsApi } from '@/api/accounts';
import { isPendingError } from '@/api/pending';
import PendingFeature from '@/components/common/PendingFeature';
import { formatNaira } from '@/utils/format';
import './Bills.scss';

// UPDATED — category ids now match the backend enum exactly (BILL_CATEGORY),
// providers are called "billers" per the API, a validate-customer step runs
// before payment, accountId is sent on every pay() call, and amount is sent
// as a decimal string.

const CATEGORIES = [
  { id: BILL_CATEGORY.AIRTIME,     label: 'Airtime',      icon: '📱' },
  { id: BILL_CATEGORY.MOBILE_DATA, label: 'Data',         icon: '📶' },
  { id: BILL_CATEGORY.ELECTRICITY, label: 'Electricity',  icon: '⚡' },
  { id: BILL_CATEGORY.CABLE_TV,    label: 'Cable TV',     icon: '📺' },
];

export default function Bills() {
  const navigate = useNavigate();
  const [accountId, setAccountId] = useState(null);
  const [category,  setCategory]  = useState(null);
  const [billers,   setBillers]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [phone,     setPhone]     = useState('');
  const [amount,    setAmount]    = useState('');
  const [bundles,   setBundles]   = useState([]);
  const [bundle,    setBundle]    = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState('');
  const [isPending, setPending]   = useState(false);

  useEffect(() => {
    accountsApi.getMyAccounts()
      .then((accounts) => setAccountId(accounts?.[0]?.id ?? null))
      .catch(() => setAccountId(null));

    // Probe the bills module so the screen reflects reality on load rather
    // than letting the user pick a category first and fail afterwards.
    billsApi.getBillers(BILL_CATEGORY.AIRTIME)
      .catch((err) => { if (isPendingError(err)) setPending(true); });
  }, []);

  async function handleCategorySelect(cat) {
    setCategory(cat);
    setSelected(null);
    setResult(null);
    setError('');
    setCustomerName('');
    try {
      setBillers(await billsApi.getBillers(cat.id));
    } catch (err) {
      if (isPendingError(err)) setPending(true);
      else setError(err.message);
    }
  }

  async function handleProviderSelect(biller) {
    setSelected(biller);
    setBundles([]);
    setBundle(null);
    setCustomerName('');
    if (category?.id === BILL_CATEGORY.MOBILE_DATA) {
      try {
        setBundles(await billsApi.getDataBundles(biller.billerCode));
      } catch (err) {
        if (isPendingError(err)) setPending(true);
        else setError(err.message);
      }
    }
  }

  // Runs before payment for meter/smart-card categories, per handover doc.
  async function handleValidateCustomer() {
    if (!phone) return;
    setIsValidating(true);
    setError('');
    try {
      const itemCode = category.id === BILL_CATEGORY.MOBILE_DATA ? bundle?.itemCode : selected.billerCode;
      const res = await billsApi.validateCustomer({
        billerCode: selected.billerCode,
        itemCode,
        customerIdentifier: phone,
      });
      setCustomerName(res.customerName);
    } catch (err) {
      setError(err.message);
      setCustomerName('');
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSubmit() {
    if (!selected || !accountId) return;
    setIsLoading(true);
    setError('');
    try {
      const itemCode = category.id === BILL_CATEGORY.MOBILE_DATA ? bundle?.itemCode : undefined;
      const decimalAmount = category.id === BILL_CATEGORY.MOBILE_DATA
        ? (bundle?.priceKobo ? (bundle.priceKobo / 100).toFixed(2) : '0.00')
        : (parseFloat(amount || '0')).toFixed(2);

      const res = await billsApi.pay({
        accountId,
        category: category.id,
        billerCode: selected.billerCode,
        itemCode,
        billerName: selected.name,
        customerIdentifier: phone,
        amount: decimalAmount,
      });
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const needsValidation = category?.id === BILL_CATEGORY.ELECTRICITY || category?.id === BILL_CATEGORY.CABLE_TV;
  const canPay = category?.id === BILL_CATEGORY.MOBILE_DATA ? !!bundle : !!phone && (!needsValidation || !!customerName);

  if (result) {
    return (
      <div className="bills">
        <div className="bills__header">
          <button className="bills__back" onClick={() => navigate('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2>Bill Payment</h2>
          <div style={{ width: 40 }} />
        </div>
        <div className="bills__success">
          <div className="bills__success-icon">✓</div>
          <h3>Payment Successful!</h3>
          {result.valueToken && <div className="bills__token"><p>Electricity Token</p><strong>{result.valueToken}</strong></div>}
          <button className="bills__btn" onClick={() => { setResult(null); setCategory(null); }}>Make Another Payment</button>
          <button className="bills__btn secondary" onClick={() => navigate('/dashboard')}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bills">
      <div className="bills__header">
        <button className="bills__back" onClick={() => category ? setCategory(null) : navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>Pay Bills</h2>
        <div style={{ width: 40 }} />
      </div>

      {isPending ? (
        <PendingFeature
          title="Bill payments"
          module="bills"
          note="Biller lists and pricing must come from the provider. Showing invented prices for a purchase you are about to make is not acceptable."
        />
      ) : (
      <div className="bills__body">
        {!category && (
          <>
            <p className="bills__label">Select Category</p>
            <div className="bills__categories">
              {CATEGORIES.map((c) => (
                <button key={c.id} className="bills__category" onClick={() => handleCategorySelect(c)}>
                  <span className="bills__category-icon">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {category && (
          <>
            <p className="bills__label">Select {category.label} Provider</p>
            <div className="bills__providers">
              {billers.map((p) => (
                <button
                  key={p.billerCode}
                  className={'bills__provider' + (selected?.billerCode === p.billerCode ? ' active' : '')}
                  onClick={() => handleProviderSelect(p)}
                >
                  <span>{p.logo}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>

            {selected && (
              <div className="bills__form">
                <div className="bills__field">
                  <label>{category.id === BILL_CATEGORY.ELECTRICITY ? 'Meter Number' : category.id === BILL_CATEGORY.CABLE_TV ? 'Smart Card Number' : 'Phone Number'}</label>
                  <input
                    className="bills__input"
                    type="text"
                    inputMode="numeric"
                    placeholder={category.id === BILL_CATEGORY.AIRTIME || category.id === BILL_CATEGORY.MOBILE_DATA ? '080XXXXXXXX' : 'Enter number'}
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setCustomerName(''); }}
                    onBlur={needsValidation ? handleValidateCustomer : undefined}
                  />
                </div>

                {needsValidation && isValidating && <p className="bills__validating">Verifying customer…</p>}
                {needsValidation && customerName && <p className="bills__customer-name">✓ {customerName}</p>}

                {category.id === BILL_CATEGORY.MOBILE_DATA && bundles.length > 0 && (
                  <div className="bills__bundles">
                    <label>Select Bundle</label>
                    {bundles.map((b) => (
                      <button
                        key={b.itemCode}
                        className={'bills__bundle' + (bundle?.itemCode === b.itemCode ? ' active' : '')}
                        onClick={() => setBundle(b)}
                      >
                        <span className="bills__bundle-name">{b.name}</span>
                        <span className="bills__bundle-info">{b.validity}</span>
                        <strong>{formatNaira(b.priceKobo)}</strong>
                      </button>
                    ))}
                  </div>
                )}

                {(category.id === BILL_CATEGORY.AIRTIME || category.id === BILL_CATEGORY.ELECTRICITY || category.id === BILL_CATEGORY.CABLE_TV) && (
                  <div className="bills__field">
                    <label>Amount (NGN)</label>
                    <input
                      className="bills__input"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                )}

                {error && <p className="bills__error">⚠ {error}</p>}

                <button
                  className="bills__btn"
                  onClick={handleSubmit}
                  disabled={isLoading || !canPay || !accountId}
                >
                  {isLoading ? 'Processing…' : 'Pay Now'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}
