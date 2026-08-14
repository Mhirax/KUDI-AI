import { formatNaira } from '@/utils/format';
import './SavingsGoals.scss';

export default function SavingsGoals({ goals = [], isLoading }) {

  if (isLoading) {
    return (
      <section className="savings-goals">
        <div className="savings-goals__header">
          <h3 className="savings-goals__title">Savings Goals</h3>
        </div>
        <div className="savings-goals__skeleton" />
        <div className="savings-goals__skeleton" />
      </section>
    );
  }

  if (!goals.length) return null;

  return (
    <section className="savings-goals">
      <div className="savings-goals__header">
        <h3 className="savings-goals__title">Savings Goals</h3>
        <button className="savings-goals__see-all">See All</button>
      </div>

      <div className="savings-goals__list">
        {goals.map((goal) => {
          const pct = Math.min(
            Math.round((goal.savedKobo / goal.targetKobo) * 100),
            100
          );

          return (
            <div key={goal.id} className="savings-goals__item">
              <div className="savings-goals__item-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="savings-goals__item-body">
                <div className="savings-goals__item-top">
                  <span className="savings-goals__item-name">{goal.name}</span>
                  <span className="savings-goals__item-pct">{pct}%</span>
                </div>

                <div className="savings-goals__item-amounts">
                  <span>{formatNaira(goal.savedKobo)}</span>
                  <span className="savings-goals__item-target">
                    / {formatNaira(goal.targetKobo)}
                  </span>
                </div>

                <div className="savings-goals__bar-track">
                  <div
                    className="savings-goals__bar-fill"
                    style={{ width: pct + '%' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
