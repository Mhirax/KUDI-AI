import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import './LanguageSelect.scss';

const LANGUAGES = [
  { code: 'yo', label: 'Yorùbá',  flag: '🇳🇬' },
  { code: 'ha', label: 'Hausa',   flag: '🇳🇬' },
  { code: 'ig', label: 'Igbo',    flag: '🇳🇬' },
  { code: 'pc', label: 'Pidgin',  flag: '🇳🇬' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function LanguageSelect() {
  const navigate = useNavigate();
  const setSelectedLang = useAuthStore((s) => s.setSelectedLang);
  const [selected, setSelected] = useState('en');

  function handleContinue() {
    setSelectedLang(selected);
    navigate('/select-persona');
  }

  return (
    <div className="lang-select">

      <div className="lang-select__header">
        <h2 className="lang-select__title">Select Your Language</h2>
        <p className="lang-select__sub">You can change this later in settings</p>
      </div>

      <div className="lang-select__grid">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            className={`lang-select__card ${selected === lang.code ? 'active' : ''}`}
            onClick={() => setSelected(lang.code)}
          >
            <span className="lang-select__flag">{lang.flag}</span>
            <span className="lang-select__label">{lang.label}</span>
          </button>
        ))}
      </div>

      <div className="lang-select__mic-hint">
        <span className="lang-select__mic-icon">🎙️</span>
        <span>Say a language name</span>
      </div>

      <button className="lang-select__btn" onClick={handleContinue}>
        Continue
      </button>

    </div>
  );
}
