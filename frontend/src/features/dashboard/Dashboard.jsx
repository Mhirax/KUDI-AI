import { useState, useEffect } from 'react';
import { accountsApi } from '@/api/accounts';
import { ledgerApi } from '@/api/ledger';
import { savingsApi } from '@/api/savings';
import { isPendingError } from '@/api/pending';
import PendingFeature from '@/components/common/PendingFeature';
import DashboardHeader    from './components/DashboardHeader';
import BalanceCard        from './components/BalanceCard';
import QuickActions       from './components/QuickActions';
import SavingsGoals       from './components/SavingsGoals';
import RecentTransactions from './components/RecentTransactions';
import './Dashboard.scss';

// Balance and account are LIVE (GET /accounts/me).
// Savings goals and transaction history have no backend module, so they now
// render an explicit pending state. They previously showed hardcoded figures
// — a fake ₦80,000 salary credit and fake savings progress — even against the
// real backend. See docs/AUDIT.md §5.

export default function Dashboard() {
  const [account,      setAccount]      = useState(null);
  const [savings,      setSavings]      = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState({
    account: true, savings: true, transactions: true,
  });
  const [pending, setPending] = useState({ savings: false, transactions: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setError(null);

    // Accounts must load first — accountId is required for the ledger call.
    const accountsResult = await accountsApi.getMyAccounts().catch(() => null);
    const primaryAccount = accountsResult?.[0] ?? null;

    if (!primaryAccount) {
      setError('Could not load your account.');
      setLoading({ account: false, savings: false, transactions: false });
      return;
    }

    setAccount(primaryAccount);
    setLoading((l) => ({ ...l, account: false }));

    const [savingsResult, txResult] = await Promise.allSettled([
      savingsApi.getAll(),
      ledgerApi.getAccountEntriesList(primaryAccount.id, { limit: 5 }),
    ]);

    if (savingsResult.status === 'fulfilled') {
      setSavings(savingsResult.value);
    } else if (isPendingError(savingsResult.reason)) {
      setPending((p) => ({ ...p, savings: true }));
    }

    if (txResult.status === 'fulfilled') {
      setTransactions(txResult.value);
    } else if (isPendingError(txResult.reason)) {
      setPending((p) => ({ ...p, transactions: true }));
    }

    setLoading({ account: false, savings: false, transactions: false });
  }

  return (
    <div className="dashboard">
      <DashboardHeader />

      <BalanceCard
        balance={account?.balance ?? '0.00'}
        isLoading={loading.account}
      />

      <QuickActions />

      {pending.savings ? (
        <PendingFeature title="Savings goals" module="savings" />
      ) : (
        <SavingsGoals goals={savings} isLoading={loading.savings} />
      )}

      {pending.transactions ? (
        <PendingFeature
          title="Transaction history"
          module="ledger"
          note="Your balance above is real. There is no ledger yet, so the individual entries behind it cannot be listed."
        />
      ) : (
        <RecentTransactions transactions={transactions} isLoading={loading.transactions} />
      )}

      {error && (
        <div className="dashboard__error">
          <p>{error}</p>
          <button onClick={loadDashboard}>Retry</button>
        </div>
      )}
    </div>
  );
}
