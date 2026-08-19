import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { savingsApi } from '@/api/savings';
import { isPendingError } from '@/api/pending';
import PendingFeature from '@/components/common/PendingFeature';
import { formatNaira } from '@/utils/format';
import './Savings.scss';

export default function Savings() {
  const navigate = useNavigate();
  const [goals, setGoals]       = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [isPending, setPending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal]   = useState({ name: '', targetKobo: '', frequency: 'monthly' });

  useEffect(() => {
    savingsApi.getAll()
      .then(setGoals)
      .catch((err) => { if (isPendingError(err)) setPending(true); })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newGoal.name || !newGoal.targetKobo) return;
    const created = await savingsApi.create({
      name:       newGoal.name,
      targetKobo: Math.round(parseFloat(newGoal.targetKobo) * 100),
      frequency:  newGoal.frequency,
    });
    setGoals((g) => [created, ...g]);
    setShowCreate(false);
    setNewGoal({ name: '', targetKobo: '', frequency: 'monthly' });
  }

  async function handleTopUp(goalId) {
    await savingsApi.topUp(goalId, 100000); // top up NGN 1000 for demo
    const updated = await savingsApi.getAll();
    setGoals(updated);
  }

  return (
    <div className="savings-screen">
      <div className="savings-screen__header">
        <button className="savings-screen__back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>Savings Goals</h2>
        {isPending
          ? <div style={{ width: 40 }} />
          : <button className="savings-screen__add" onClick={() => setShowCreate(true)}>+</button>}
      </div>

      {isPending ? (
        <PendingFeature title="Savings goals" module="savings" />
      ) : (
      <div className="savings-screen__body">
        {isLoading ? (
          [1,2,3].map((i) => <div key={i} className="savings-screen__skeleton" />)
        ) : (
          goals.map((goal) => {
            const pct = Math.min(Math.round((goal.savedKobo / goal.targetKobo) * 100), 100);
            return (
              <div key={goal.id} className="savings-screen__goal">
                <div className="savings-screen__goal-top">
                  <div className="savings-screen__goal-icon" style={{ background: goal.color + '20', color: goal.color }}>🎯</div>
                  <div className="savings-screen__goal-info">
                    <p>{goal.name}</p>
                    <span>{goal.frequency}</span>
                  </div>
                  <span className="savings-screen__goal-pct">{pct}%</span>
                </div>
                <div className="savings-screen__goal-amounts">
                  <span>{formatNaira(goal.savedKobo)}</span>
                  <span className="savings-screen__goal-target">/ {formatNaira(goal.targetKobo)}</span>
                </div>
                <div className="savings-screen__bar-track">
                  <div className="savings-screen__bar-fill" style={{ width: pct + '%', background: goal.color }} />
                </div>
                <button className="savings-screen__topup" onClick={() => handleTopUp(goal.id)}>Add ₦1,000</button>
              </div>
            );
          })
        )}
      </div>
      )}

      {showCreate && (
        <div className="savings-screen__modal-overlay">
          <div className="savings-screen__modal">
            <h3>New Savings Goal</h3>
            <input className="savings-screen__input" placeholder="Goal name" value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} />
            <input className="savings-screen__input" type="number" placeholder="Target amount (NGN)" value={newGoal.targetKobo} onChange={(e) => setNewGoal({ ...newGoal, targetKobo: e.target.value })} />
            <select className="savings-screen__input" value={newGoal.frequency} onChange={(e) => setNewGoal({ ...newGoal, frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="savings-screen__modal-actions">
              <button onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
