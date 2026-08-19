import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './SplashScreen.scss';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isLoggedIn, onboardingDone } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        navigate('/dashboard');
      } else if (onboardingDone) {
        navigate('/login');
      } else {
        navigate('/onboarding');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="splash">
      <div className="splash__content">

        {/* Logo mark */}
        <div className="splash__logo-mark">
          <div className="splash__logo-box">
            <span className="splash__logo-letter">K</span>
          </div>
        </div>

        {/* Brand name */}
        <div className="splash__brand">
          <h1 className="splash__brand-name">KUDI AI</h1>
          <p className="splash__brand-tagline">… BANKING MADE SIMPLE …</p>
        </div>

      </div>

      {/* Loading indicator */}
      <div className="splash__footer">
        <div className="splash__loader">
          <div className="splash__loader-bar" />
        </div>
      </div>
    </div>
  );
}
