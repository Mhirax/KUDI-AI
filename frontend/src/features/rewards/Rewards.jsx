import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rewardsApi } from '@/api/rewards';
import './Rewards.scss';

export default function Rewards() {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [isLoading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => { rewardsApi.getRewards().then(setData).finally(() => setLoading(false)); }, []);

  async function handleRedeem(redemptionId) {
    setRedeeming(redemptionId);
    try {
      await rewardsApi.redeem(redemptionId);
      const updated = await rewardsApi.getRewards();
      setData(updated);
    } catch (err) {
      alert(err.message);
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <div className="rewards-screen">
      <div className="rewards-screen__header">
        <button className="rewards-screen__back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>Rewards</h2>
        <div style={{ width: 40 }} />
      </div>

      {isLoading ? (
        <div style={{ padding: '40px 20px', color: '#9898B0', textAlign: 'center' }}>Loading…</div>
      ) : (
        <div className="rewards-screen__body">
          <div className="rewards-screen__points-card">
            <p>Your Points</p>
            <h2>{data?.points?.toLocaleString()}</h2>
            <span>{data?.tier} Member</span>
          </div>

          <p className="rewards-screen__section-title">Redeem For</p>

          {data?.redemptions?.map((item) => (
            <div key={item.id} className="rewards-screen__item">
              <div className="rewards-screen__item-info">
                <p>{item.name}</p>
                <span>{item.pointsCost.toLocaleString()} points</span>
              </div>
              <button
                className="rewards-screen__redeem-btn"
                onClick={() => handleRedeem(item.id)}
                disabled={redeeming === item.id || (data.points < item.pointsCost)}
              >
                {redeeming === item.id ? '…' : 'Redeem'}
              </button>
            </div>
          ))}

          <p className="rewards-screen__section-title" style={{ marginTop: 24 }}>History</p>
          {data?.history?.map((h) => (
            <div key={h.id} className={'rewards-screen__history-item ' + h.type}>
              <p>{h.description}</p>
              <span>{h.points > 0 ? '+' : ''}{h.points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
