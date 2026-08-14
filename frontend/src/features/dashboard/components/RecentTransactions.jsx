import { formatNairaDecimal, formatTransactionTime, getInitials } from '@/utils/format';
import './RecentTransactions.scss';

// UPDATED — data now comes from GET /ledger/accounts/:accountId/entries.
// Ledger entry shape: { id, direction: 'DEBIT'|'CREDIT', description, amount
// (decimal string), createdAt }. Old mock shape used type/amountKobo/timestamp.

export default function RecentTransactions({ transactions = [], isLoading }) {

  if (isLoading) {
    return (
      <section className="recent-tx">
        <div className="recent-tx__header">
          <h3 className="recent-tx__title">Recent Transactions</h3>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="recent-tx__skeleton" />
        ))}
      </section>
    );
  }

  if (!transactions.length) {
    return (
      <section className="recent-tx">
        <div className="recent-tx__header">
          <h3 className="recent-tx__title">Recent Transactions</h3>
        </div>
        <div className="recent-tx__empty">
          <p>No transactions yet</p>
          <span>Your activity will appear here</span>
        </div>
      </section>
    );
  }

  return (
    <section className="recent-tx">
      <div className="recent-tx__header">
        <h3 className="recent-tx__title">Transaction History</h3>
        <button className="recent-tx__see-all">See All</button>
      </div>

      <ul className="recent-tx__list">
        {transactions.map((tx) => {
          const isCredit = tx.direction === 'CREDIT';
          const cssType = isCredit ? 'credit' : 'debit';
          return (
            <li key={tx.id} className="recent-tx__item">

              {/* Avatar / initials */}
              <div className={`recent-tx__avatar ${cssType}`}>
                <span>{getInitials(tx.description)}</span>
              </div>

              {/* Description and time */}
              <div className="recent-tx__info">
                <p className="recent-tx__desc">{tx.description}</p>
                <p className="recent-tx__time">{formatTransactionTime(tx.createdAt)}</p>
              </div>

              {/* Amount */}
              <div className={`recent-tx__amount ${cssType}`}>
                {isCredit ? '+' : '−'}
                {formatNairaDecimal(tx.amount)}
              </div>

            </li>
          );
        })}
      </ul>
    </section>
  );
}
