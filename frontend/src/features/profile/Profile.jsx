import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '@/api/profile';
import { kycApi } from '@/api/kyc';
import { accountsApi } from '@/api/accounts';
import { useAuthStore } from '@/store/authStore';
import { formatTransactionTime, formatNairaDecimal } from '@/utils/format';
import './Profile.scss';

// UPDATED — profile now sourced from GET /users/me (firstName/lastName, no
// fullName). KYC tier from GET /kyc/me (TIER_1/TIER_2/TIER_3, CBN framework)
// instead of the old pending/submitted/verified/rejected mock status.
// Account number card now pulls from GET /accounts/me since UserResponseDto
// has no account fields.

const TIER_LABEL = { TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3' };
const TIER_COLOR = { TIER_1: '#FFB800', TIER_2: '#4A6CF7', TIER_3: '#00C48C' };

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [profile, setProfile]       = useState(null);
  const [kyc, setKyc]               = useState(null);
  const [account, setAccount]       = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setLoading]     = useState(true);
  const [showNotif, setShowNotif]   = useState(false);

  useEffect(() => {
    Promise.all([
      profileApi.getProfile(),
      profileApi.getNotifications(),
      kycApi.getStatus().catch(() => null),
      accountsApi.getMyAccounts().catch(() => []),
    ]).then(([p, n, k, accounts]) => {
      setProfile(p);
      setNotifications(n);
      setKyc(k);
      setAccount(accounts?.[0] ?? null);
    }).finally(() => setLoading(false));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    await profileApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';

  return (
    <div className="profile-screen">
      <div className="profile-screen__header">
        <h2>Profile</h2>
        <button className="profile-screen__notif-btn" onClick={() => setShowNotif(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {unreadCount > 0 && <span className="profile-screen__notif-badge">{unreadCount}</span>}
        </button>
      </div>

      {isLoading ? (
        <div className="profile-screen__skeleton" />
      ) : (
        <div className="profile-screen__body">
          <div className="profile-screen__avatar-section">
            <div className="profile-screen__avatar">
              {fullName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
            </div>
            <h3>{fullName}</h3>
            <p>{profile?.email}</p>
            <p>{profile?.phoneNumber}</p>
            {kyc && (
              <div className="profile-screen__kyc-badge" style={{ background: TIER_COLOR[kyc.tier] + '20', color: TIER_COLOR[kyc.tier] }}>
                KYC: {TIER_LABEL[kyc.tier] || kyc.tier}
              </div>
            )}
          </div>

          {account && (
            <div className="profile-screen__account-card">
              <p className="profile-screen__account-label">{account.accountType} Account</p>
              <p className="profile-screen__account-number">{formatNairaDecimal(account.balance)}</p>
              <p className="profile-screen__account-bank">{account.currency} · {account.status}</p>
            </div>
          )}

          <div className="profile-screen__menu">
            {[
              { label: 'Account Settings', icon: '⚙️' },
              { label: 'Security',         icon: '🔐' },
              { label: 'Language',         icon: '🌍' },
              { label: 'Switch Persona',   icon: '👤' },
              { label: 'Notification Preferences', icon: '🔔' },
              { label: 'Help & Support',   icon: '💬' },
            ].map((item) => (
              <button key={item.label} className="profile-screen__menu-item">
                <span>{item.icon}</span>
                <span>{item.label}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>

          <button className="profile-screen__logout" onClick={handleLogout}>Log Out</button>
        </div>
      )}

      {showNotif && (
        <div className="profile-screen__modal-overlay" onClick={() => setShowNotif(false)}>
          <div className="profile-screen__modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-screen__modal-header">
              <h3>Notifications</h3>
              <button onClick={handleMarkAllRead}>Mark all read</button>
            </div>
            {notifications.map((n) => (
              <div key={n.id} className={'profile-screen__notif-item' + (!n.read ? ' unread' : '')}>
                <div className="profile-screen__notif-dot" />
                <div>
                  <p>{n.title}</p>
                  <span>{n.body}</span>
                  <small>{formatTransactionTime(n.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
