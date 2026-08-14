import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardsApi } from '@/api/cards';
import { formatNaira } from '@/utils/format';
import './Cards.scss';

export default function Cards() {
  const navigate = useNavigate();
  const [cards, setCards]       = useState([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => { cardsApi.getCards().then(setCards).finally(() => setLoading(false)); }, []);

  async function handleFreeze(cardId) {
    await cardsApi.freeze(cardId);
    const updated = await cardsApi.getCards();
    setCards(updated);
  }

  return (
    <div className="cards-screen">
      <div className="cards-screen__header">
        <button className="cards-screen__back" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2>My Cards</h2>
        <div style={{ width: 40 }} />
      </div>

      <div className="cards-screen__body">
        {isLoading ? (
          <div className="cards-screen__skeleton" />
        ) : (
          cards.map((card) => (
            <div key={card.id} className={'cards-screen__card ' + card.type}>
              <div className="cards-screen__card-top">
                <span className="cards-screen__card-type">💳 Kudi {card.type === 'virtual' ? 'Virtual' : 'Physical'} Card</span>
                {card.status === 'frozen' && <span className="cards-screen__frozen-badge">Frozen</span>}
                {card.status === 'pending' && <span className="cards-screen__pending-badge">Pending Delivery</span>}
              </div>
              <div className="cards-screen__card-number">•••• •••• •••• {card.last4}</div>
              {card.balance > 0 && <p className="cards-screen__card-balance">{formatNaira(card.balance)}</p>}

              {card.status !== 'pending' && (
                <div className="cards-screen__card-actions">
                  <button onClick={() => handleFreeze(card.id)}>
                    {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                  </button>
                  <button>Top Up</button>
                </div>
              )}
              {card.status === 'pending' && (
                <p className="cards-screen__delivery">Requested {new Date(card.requestedAt).toLocaleDateString()}</p>
              )}
            </div>
          ))
        )}
        <button className="cards-screen__order-btn">+ Order New Card</button>
      </div>
    </div>
  );
}
