import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './PersonaSelect.scss';

const PERSONAS = [
  { id: 'market_woman', emoji: '🧺', label: 'Market Woman' },
  { id: 'artisan',      emoji: '🔨', label: 'Artisan' },
  { id: 'small_trader', emoji: '📦', label: 'Small Trader' },
  { id: 'personal',     emoji: '👤', label: 'Personal' },
  { id: 'student',      emoji: '🎓', label: 'Student' },
  { id: 'elder',        emoji: '👵', label: 'Elder / Easy' },
  { id: 'business',     emoji: '🏢', label: 'Business' },
];

export default function PersonaSelect() {
  const navigate = useNavigate();
  const { setSelectedPersona, setOnboardingDone } = useAuthStore();
  const [selected, setSelected] = useState('personal');

  function handleContinue() {
    setSelectedPersona(selected);
    setOnboardingDone();
    navigate('/login');
  }

  return (
    <div className="persona-select">

      <div className="persona-select__header">
        <h2 className="persona-select__title">Who is using Kudi AI?</h2>
        <p className="persona-select__sub">We'll personalise your experience</p>
      </div>

      <div className="persona-select__grid">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className={`persona-select__card ${selected === p.id ? 'active' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            <span className="persona-select__emoji">{p.emoji}</span>
            <span className="persona-select__label">{p.label}</span>
          </button>
        ))}
      </div>

      <div className="persona-select__mic-hint">
        <span>🎙️</span>
        <span>Say a persona name or tap to select</span>
      </div>

      <button className="persona-select__btn" onClick={handleContinue}>
        Continue with Selected Mode
      </button>

    </div>
  );
}
