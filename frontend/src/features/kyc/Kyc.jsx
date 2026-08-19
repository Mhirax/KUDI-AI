import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { kycApi } from '@/api/kyc';
import './Kyc.scss';

// BVN unlocks TIER_2, NIN unlocks TIER_3 — NIN submission is gated until BVN
// is verified, matching the CBN tier progression documented in api/kyc.js.

const TIER_LABEL = { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3' };

export default function Kyc() {
  const navigate = useNavigate();
  const [status,   setStatus]   = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [bvn,        setBvn]        = useState('');
  const [bvnError,   setBvnError]   = useState('');
  const [bvnSubmitting, setBvnSubmitting] = useState(false);

  const [nin,        setNin]        = useState('');
  const [ninError,   setNinError]   = useState('');
  const [ninSubmitting, setNinSubmitting] = useState(false);

  useEffect(() => {
    // Must not float: without a catch a failed fetch leaves status null, and
    // the screen would render a fully-verified user as unverified and invite
    // them to re-submit their BVN.
    kycApi.getStatus()
      .then(setStatus)
      .catch((err) => setLoadError(err.message || 'Could not load your KYC status.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleVerifyBvn() {
    if (!/^\d{11}$/.test(bvn)) {
      setBvnError('BVN must be 11 digits.');
      return;
    }
    setBvnSubmitting(true);
    setBvnError('');
    try {
      const updated = await kycApi.verifyBvn(bvn);
      setStatus(updated);
      setBvn('');
    } catch (err) {
      setBvnError(err.message || 'Could not verify BVN.');
    } finally {
      setBvnSubmitting(false);
    }
  }

  async function handleVerifyNin() {
    if (!/^\d{11}$/.test(nin)) {
      setNinError('NIN must be 11 digits.');
      return;
    }
    setNinSubmitting(true);
    setNinError('');
    try {
      const updated = await kycApi.verifyNin(nin);
      setStatus(updated);
      setNin('');
    } catch (err) {
      setNinError(err.message || 'Could not verify NIN.');
    } finally {
      setNinSubmitting(false);
    }
  }

  const bvnVerified = !!status?.bvnVerified;
  const ninVerified = !!status?.ninVerified;

  return (
    <div className="kyc">
      <div className="kyc__header">
        <button className="kyc__back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>Verify Identity</h2>
        <div style={{ width: 40 }} />
      </div>

      {isLoading ? (
        <div className="kyc__skeleton" />
      ) : loadError ? (
        <div className="kyc__body">
          <p className="kyc__error">⚠ {loadError}</p>
        </div>
      ) : (
        <div className="kyc__body">
          <div className="kyc__tier-card">
            <p className="kyc__tier-label">Current Tier</p>
            <p className="kyc__tier-value">{TIER_LABEL[status?.tier] || status?.tier}</p>
            <p className="kyc__tier-hint">Verify your BVN and NIN to unlock higher transaction limits.</p>
          </div>

          {/* BVN */}
          <div className="kyc__step">
            <div className="kyc__step-header">
              <span className={'kyc__step-badge' + (bvnVerified ? ' done' : '')}>{bvnVerified ? '✓' : '1'}</span>
              <span className="kyc__step-title">Bank Verification Number (BVN)</span>
            </div>

            {bvnVerified ? (
              <p className="kyc__verified-value">Verified · {status.bvnMasked}</p>
            ) : (
              <div className="kyc__form">
                <input
                  className="kyc__input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter your 11-digit BVN"
                  maxLength={11}
                  value={bvn}
                  onChange={(e) => { setBvn(e.target.value.replace(/\D/g, '')); setBvnError(''); }}
                  disabled={bvnSubmitting}
                />
                {bvnError && <p className="kyc__error">⚠ {bvnError}</p>}
                <button
                  className="kyc__btn"
                  onClick={handleVerifyBvn}
                  disabled={bvnSubmitting || bvn.length !== 11}
                >
                  {bvnSubmitting ? 'Verifying…' : 'Verify BVN'}
                </button>
              </div>
            )}
          </div>

          {/* NIN */}
          <div className="kyc__step">
            <div className="kyc__step-header">
              <span className={'kyc__step-badge' + (ninVerified ? ' done' : '')}>{ninVerified ? '✓' : '2'}</span>
              <span className="kyc__step-title">National Identity Number (NIN)</span>
            </div>

            {ninVerified ? (
              <p className="kyc__verified-value">Verified · {status.ninMasked}</p>
            ) : !bvnVerified ? (
              <p className="kyc__locked-hint">Verify your BVN first to unlock this step.</p>
            ) : (
              <div className="kyc__form">
                <input
                  className="kyc__input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter your 11-digit NIN"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => { setNin(e.target.value.replace(/\D/g, '')); setNinError(''); }}
                  disabled={ninSubmitting}
                />
                {ninError && <p className="kyc__error">⚠ {ninError}</p>}
                <button
                  className="kyc__btn"
                  onClick={handleVerifyNin}
                  disabled={ninSubmitting || nin.length !== 11}
                >
                  {ninSubmitting ? 'Verifying…' : 'Verify NIN'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
