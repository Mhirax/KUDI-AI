import { useNavigate } from 'react-router-dom';
import './AuthLayout.scss';

export default function AuthLayout({ children, title, subtitle, showBack = true }) {
  const navigate = useNavigate();

  return (
    <div className="auth-layout">
      <div className="auth-layout__header">
        {showBack && (
          <button className="auth-layout__back" onClick={() => navigate(-1)} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <div className="auth-layout__logo">
          <span>K</span>
        </div>
      </div>

      <div className="auth-layout__body">
        <div className="auth-layout__titles">
          <h1 className="auth-layout__title">{title}</h1>
          {subtitle && <p className="auth-layout__subtitle">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
