import { useState, useEffect } from 'react';
import { accountsApi } from '@/api/accounts';
import { ledgerApi } from '@/api/ledger';
import { walletApi } from '@/api/wallet';
import DashboardHeader    from './components/DashboardHeader';
import BalanceCard        from './components/BalanceCard';
import QuickActions       from './components/QuickActions';
import SavingsGoals       from './components/SavingsGoals';
import RecentTransactions from './components/RecentTransactions';
import './Dashboard.scss';

// UPDATED — balance and transaction history now come from the real modules:
//   GET /accounts/me                       -> account (balance is a decimal string)
//   GET /ledger/accounts/:accountId/entries -> transaction history
// walletApi.getBalance()/getTransactions() are gone (no such endpoints exist).
// Savings still has no backend module, so it stays on walletApi's mock data.

export default function Dashboard() {
  const [account,      setAccount]      = useState(null);
  const [savings,      setSavings]      = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState({
    account: true, savings: true, transactions: true,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    // Accounts must load first — accountId is required for the ledger call.
    const accountsResult = await accountsApi.getMyAccounts().catch(() => null);
    const primaryAccount = accountsResult?.[0] ?? null;

    if (!primaryAccount) {
      setError('Could not load account.');
      setLoading({ account: false, savings: false, transactions: false });
      return;
    }

    setAccount(primaryAccount);
    setLoading((l) => ({ ...l, account: false }));

    const [savingsResult, txResult] = await Promise.allSettled([
      walletApi.getSavings(),
      ledgerApi.getAccountEntriesList(primaryAccount.id, { limit: 5 }),
    ]);

    if (savingsResult.status === 'fulfilled') {
      setSavings(savingsResult.value);
    }

    if (txResult.status === 'fulfilled') {
      setTransactions(txResult.value);
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

      <SavingsGoals
        goals={savings}
        isLoading={loading.savings}
      />

      <RecentTransactions
        transactions={transactions}
        isLoading={loading.transactions}
      />

      {error && (
        <div className="dashboard__error">
          <p>{error}</p>
          <button onClick={loadDashboard}>Retry</button>
        </div>
      )}
    </div>
  );
}
