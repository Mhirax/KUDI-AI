import './AuthButton.scss';

export default function AuthButton({ children, onClick, disabled = false, loading = false, variant = 'primary' }) {
  return (
    <button
      className={`auth-btn auth-btn--${variant} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="auth-btn__spinner" />
      ) : (
        children
      )}
    </button>
  );
}
