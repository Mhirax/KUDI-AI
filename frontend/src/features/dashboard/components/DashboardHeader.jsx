import { useAuthStore } from '@/store/authStore';
import './DashboardHeader.scss';

export default function DashboardHeader() {
  const user = useAuthStore((s) => s.user);
  // UPDATED — UserResponseDto has firstName/lastName, no fullName field.
  const firstName = user?.firstName || 'there';

  return (
    <header className="dash-header">
      <div className="dash-header__left">
        <div className="dash-header__brand">
          <div className="dash-header__logo">K</div>
          <span className="dash-header__brand-name">KUDI AI</span>
        </div>
        <p className="dash-header__greeting">
          Hi, {firstName.toUpperCase()}! 👋
        </p>
        <p className="dash-header__tagline">BANKING MADE SIMPLE</p>
      </div>

      <div className="dash-header__right">
        <button className="dash-header__mode-btn">Switch Mode ▾</button>
        <button className="dash-header__icon-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="dash-header__badge" />
        </button>
      </div>
    </header>
  );
}
