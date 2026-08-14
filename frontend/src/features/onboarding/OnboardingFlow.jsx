import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingFlow.scss';

const SLIDES = [
  {
    id: 1,
    emoji: '👋',
    title: 'Welcome to Kudi AI!',
    body: 'The voice‑first bank that speaks your language.',
    bg: 'rgba(0, 212, 200, 0.06)',
  },
  {
    id: 2,
    emoji: '🗣️',
    title: 'Do everything by voice',
    body: 'Send money, pay bills, save, and even shop — just speak.',
    bg: 'rgba(74, 108, 247, 0.06)',
  },
  {
    id: 3,
    emoji: '🔐',
    title: 'Secure with your voice',
    body: 'Your voice is your password. No one else can access your account.',
    bg: 'rgba(123, 47, 190, 0.06)',
  },
];

export default function OnboardingFlow() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);

  const isLast = current === SLIDES.length - 1;
  const slide  = SLIDES[current];

  function handleNext() {
    if (isLast) {
      navigate('/select-language');
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function handleSkip() {
    navigate('/select-language');
  }

  return (
    <div className="onboarding" style={{ '--slide-bg': slide.bg }}>

      {/* Skip button */}
      {!isLast && (
        <button className="onboarding__skip" onClick={handleSkip}>
          Skip
        </button>
      )}

      {/* Slide content */}
      <div className="onboarding__slide" key={slide.id}>
        <div className="onboarding__illustration">
          <span className="onboarding__emoji">{slide.emoji}</span>
        </div>

        <div className="onboarding__text">
          <h2 className="onboarding__title">{slide.title}</h2>
          <p className="onboarding__body">{slide.body}</p>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="onboarding__dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            className={`onboarding__dot ${i === current ? 'active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* CTA button */}
      <div className="onboarding__footer">
        <button className="onboarding__btn" onClick={handleNext}>
          {isLast ? 'Get Started' : 'Next'}
        </button>
      </div>

    </div>
  );
}
