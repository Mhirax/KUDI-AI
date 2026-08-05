# Kudi AI Bank - API Endpoints Documentation
**Generated: 2026-08-01T15:26:02.023Z**
**Total Endpoints: 59**

---

## 📋 Table of Contents

- [Identity](#identity) (7 endpoints)
- [Accounts](#accounts) (7 endpoints)
- [Transfers](#transfers) (4 endpoints)
- [Cards](#cards) (7 endpoints)
- [Compliance](#compliance) (3 endpoints)
- [Funding](#funding) (5 endpoints)
- [Ledger](#ledger) (3 endpoints)
- [Bills](#bills) (6 endpoints)
- [Loans](#loans) (5 endpoints)
- [Rewards](#rewards) (3 endpoints)
- [Savings](#savings) (5 endpoints)
- [Notifications](#notifications) (4 endpoints)

---

## Identity

| 🔵 POST | `/api/v1/auth/register` |
| 🔵 POST | `/api/v1/auth/login` |
| 🔵 POST | `/api/v1/auth/refresh` |
| 🔵 POST | `/api/v1/auth/logout` |
| 🔵 POST | `/api/v1/auth/change-password` |
| 🟢 GET | `/api/v1/users/me` |
| 🟢 GET | `/api/v1/users/:userId` |

## Accounts

| 🟢 GET | `/api/v1/accounts/me` |
| 🟢 GET | `/api/v1/accounts/:accountId` |
| 🔵 POST | `/api/v1/accounts/:accountId/credit` |
| 🔵 POST | `/api/v1/accounts/:accountId/debit` |
| 🔵 POST | `/api/v1/accounts/:accountId/freeze` |
| 🔵 POST | `/api/v1/accounts/:accountId/unfreeze` |
| 🔵 POST | `/api/v1/accounts/:accountId/close` |

## Transfers

| 🟢 GET | `/api/v1/transfers/me` |
| 🟢 GET | `/api/v1/transfers/:reference` |
| 🔵 POST | `/api/v1/transfers/internal` |
| 🔵 POST | `/api/v1/transfers/external` |

## Cards

| 🟢 GET | `/api/v1/cards/:id` |
| 🔵 POST | `/api/v1/cards/create-virtual` |
| 🔵 POST | `/api/v1/cards/request-physical` |
| 🔵 POST | `/api/v1/cards/freeze` |
| 🔵 POST | `/api/v1/cards/unfreeze` |
| 🔵 POST | `/api/v1/cards/fund` |
| 🔵 POST | `/api/v1/cards/terminate` |

## Compliance

| 🟢 GET | `/api/v1/kyc/me` |
| 🔵 POST | `/api/v1/kyc/verify-bvn` |
| 🔵 POST | `/api/v1/kyc/verify-nin` |

## Funding

| 🟢 GET | `/api/v1/funding/virtual-accounts/me` |
| 🟢 GET | `/api/v1/funding/deposits/me` |
| 🟢 GET | `/api/v1/funding/deposits/:reference` |
| 🔵 POST | `/api/v1/funding/virtual-accounts` |
| 🔵 POST | `/api/v1/funding/checkout` |

## Ledger

| 🟢 GET | `/api/v1/ledger/accounts/:accountId/entries` |
| 🟢 GET | `/api/v1/ledger/accounts/:accountId/statement` |
| 🟢 GET | `/api/v1/ledger/entries/:entryId` |

## Bills

| 🟢 GET | `/api/v1/bills/billers` |
| 🟢 GET | `/api/v1/bills/me` |
| 🟢 GET | `/api/v1/bills/:reference` |
| 🔵 POST | `/api/v1/bills/validate-customer` |
| 🔵 POST | `/api/v1/bills/pay` |
| 🔵 POST | `/api/v1/bills/:reference/refresh-status` |

## Loans

| 🟢 GET | `/api/v1/loans/:id` |
| 🔵 POST | `/api/v1/loans/apply` |
| 🔵 POST | `/api/v1/loans/approve` |
| 🔵 POST | `/api/v1/loans/disburse` |
| 🔵 POST | `/api/v1/loans/repay` |

## Rewards

| 🟢 GET | `/api/v1/rewards/history` |
| 🔵 POST | `/api/v1/rewards/redeem` |
| 🔵 POST | `/api/v1/rewards/referral` |

## Savings

| 🟢 GET | `/api/v1/savings/:id` |
| 🔵 POST | `/api/v1/savings/create` |
| 🔵 POST | `/api/v1/savings/deposit` |
| 🔵 POST | `/api/v1/savings/withdraw` |
| 🔵 POST | `/api/v1/savings/close` |

## Notifications

| 🟢 GET | `/api/v1/notifications/me` |
| 🟢 GET | `/api/v1/notifications/me/unread-count` |
| 🔵 POST | `/api/v1/notifications/:notificationId/read` |
| 🔵 POST | `/api/v1/notifications/read-all` |


---

## 📊 Complete Endpoint Reference

| Module | Method | Path | Count |
|--------|--------|------|-------|
| Identity | POST | /api/v1/auth/register | 7 |
|  | POST | /api/v1/auth/login |  |
|  | POST | /api/v1/auth/refresh |  |
|  | POST | /api/v1/auth/logout |  |
|  | POST | /api/v1/auth/change-password |  |
|  | GET | /api/v1/users/me |  |
|  | GET | /api/v1/users/:userId |  |
| Accounts | GET | /api/v1/accounts/me | 7 |
|  | GET | /api/v1/accounts/:accountId |  |
|  | POST | /api/v1/accounts/:accountId/credit |  |
|  | POST | /api/v1/accounts/:accountId/debit |  |
|  | POST | /api/v1/accounts/:accountId/freeze |  |
|  | POST | /api/v1/accounts/:accountId/unfreeze |  |
|  | POST | /api/v1/accounts/:accountId/close |  |
| Transfers | GET | /api/v1/transfers/me | 4 |
|  | GET | /api/v1/transfers/:reference |  |
|  | POST | /api/v1/transfers/internal |  |
|  | POST | /api/v1/transfers/external |  |
| Cards | GET | /api/v1/cards/:id | 7 |
|  | POST | /api/v1/cards/create-virtual |  |
|  | POST | /api/v1/cards/request-physical |  |
|  | POST | /api/v1/cards/freeze |  |
|  | POST | /api/v1/cards/unfreeze |  |
|  | POST | /api/v1/cards/fund |  |
|  | POST | /api/v1/cards/terminate |  |
| Compliance | GET | /api/v1/kyc/me | 3 |
|  | POST | /api/v1/kyc/verify-bvn |  |
|  | POST | /api/v1/kyc/verify-nin |  |
| Funding | GET | /api/v1/funding/virtual-accounts/me | 5 |
|  | GET | /api/v1/funding/deposits/me |  |
|  | GET | /api/v1/funding/deposits/:reference |  |
|  | POST | /api/v1/funding/virtual-accounts |  |
|  | POST | /api/v1/funding/checkout |  |
| Ledger | GET | /api/v1/ledger/accounts/:accountId/entries | 3 |
|  | GET | /api/v1/ledger/accounts/:accountId/statement |  |
|  | GET | /api/v1/ledger/entries/:entryId |  |
| Bills | GET | /api/v1/bills/billers | 6 |
|  | GET | /api/v1/bills/me |  |
|  | GET | /api/v1/bills/:reference |  |
|  | POST | /api/v1/bills/validate-customer |  |
|  | POST | /api/v1/bills/pay |  |
|  | POST | /api/v1/bills/:reference/refresh-status |  |
| Loans | GET | /api/v1/loans/:id | 5 |
|  | POST | /api/v1/loans/apply |  |
|  | POST | /api/v1/loans/approve |  |
|  | POST | /api/v1/loans/disburse |  |
|  | POST | /api/v1/loans/repay |  |
| Rewards | GET | /api/v1/rewards/history | 3 |
|  | POST | /api/v1/rewards/redeem |  |
|  | POST | /api/v1/rewards/referral |  |
| Savings | GET | /api/v1/savings/:id | 5 |
|  | POST | /api/v1/savings/create |  |
|  | POST | /api/v1/savings/deposit |  |
|  | POST | /api/v1/savings/withdraw |  |
|  | POST | /api/v1/savings/close |  |
| Notifications | GET | /api/v1/notifications/me | 4 |
|  | GET | /api/v1/notifications/me/unread-count |  |
|  | POST | /api/v1/notifications/:notificationId/read |  |
|  | POST | /api/v1/notifications/read-all |  |
