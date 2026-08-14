import { useNavigate } from 'react-router-dom';
import './QuickActions.scss';

const ACTIONS = [
  { id: 'send',    label: 'Send',    route: '/transfer', icon: SendIcon },
  { id: 'airtime', label: 'Airtime', route: '/bills/airtime', icon: AirtimeIcon },
  { id: 'bills',   label: 'Bills',   route: '/bills', icon: BillsIcon },
  { id: 'savings', label: 'Savings', route: '/savings', icon: SavingsIcon },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="quick-actions">
      <div className="quick-actions__header">
        <h3 className="quick-actions__title">Quick Actions</h3>
        <button className="quick-actions__see-all">See All</button>
      </div>

      <div className="quick-actions__grid">
        {ACTIONS.map(({ id, label, route, icon: Icon }) => (
          <button
            key={id}
            className="quick-actions__item"
            onClick={() => navigate(route)}
          >
            <div className="quick-actions__icon-wrap">
              <Icon />
            </div>
            <span className="quick-actions__label">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AirtimeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function BillsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SavingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
