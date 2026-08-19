# Frontend ↔ Backend API Contract Map

**One real backend contract, one frontend implementation against it.**

This file is the authoritative mapping of
`Frontend feature → API client → Backend module → Endpoint`.

Rules:
1. A frontend method may only call an endpoint listed as **LIVE** here.
2. Anything not LIVE must throw `FeatureNotAvailableError` from
   `src/api/pending.js`. Never a mock, never a fallback, never a silent success.
3. When a backend module ships, move its rows to LIVE and delete the
   corresponding `pendingEndpoint()` calls in the same PR.

Legend: **LIVE** = implemented and callable · **PENDING** = no backend

---

## LIVE — implemented on both sides

| Frontend feature | API client | Method | Endpoint | Backend module |
|---|---|---|---|---|
| Signup | `auth.js` | `register` | `POST /auth/register` | identity |
| Login | `auth.js` | `login` | `POST /auth/login` | identity |
| _(client)_ | `auth.js` | `refresh` | `POST /auth/refresh` | identity |
| Profile | `auth.js` | `logout` | `POST /auth/logout` | identity |
| Profile | `auth.js` | `changePassword` | `POST /auth/change-password` | identity |
| Profile | `profile.js` | `getProfile` | `GET /users/me` | identity |
| Dashboard, Profile, Transfer, Bills | `accounts.js` | `getMyAccounts` | `GET /accounts/me` | accounts |
| Login | `accounts.js` | `createAccount` | `POST /accounts` | accounts |
| — | `accounts.js` | `getAccount` | `GET /accounts/:id` | accounts |
| — | `accounts.js` | `closeAccount` | `POST /accounts/:id/close` | accounts |
| KYC, Profile | `kyc.js` | `getStatus` | `GET /kyc/me` | compliance |
| KYC | `kyc.js` | `verifyBvn` | `POST /kyc/verify-bvn` | compliance |
| KYC | `kyc.js` | `verifyNin` | `POST /kyc/verify-nin` | compliance |
| Transfer | `transfer.js` | `initiateExternal` | `POST /transfers/external` | transfers |
| _(no UI yet)_ | `transfer.js` | `initiateInternal` | `POST /transfers/internal` | transfers |
| Transfer | `transfer.js` | `getMyTransfers` | `GET /transfers/me` | transfers |
| Transfer | `transfer.js` | `getByReference` | `GET /transfers/:reference` | transfers |

### Backend endpoints with no frontend caller

Admin/compliance surface — intentionally not called by the user-facing app.

| Endpoint | Module | Note |
|---|---|---|
| `POST /accounts/:id/credit` | accounts | admin only |
| `POST /accounts/:id/debit` | accounts | admin only |
| `POST /accounts/:id/freeze` | accounts | compliance only |
| `POST /accounts/:id/unfreeze` | accounts | compliance only |
| `GET /users/:userId` | identity | admin only |
| `POST /webhooks/flutterwave/transfers` | transfers | provider callback |

---

## PENDING — frontend expects, backend does not provide

Every method below throws `FeatureNotAvailableError`. No mock data is returned.

| Frontend feature | API client | Method | Endpoint the UI assumed | Needed module |
|---|---|---|---|---|
| Dashboard | `ledger.js` | `getAccountEntries` | `GET /ledger/accounts/:id/entries` | **ledger** |
| Dashboard | `ledger.js` | `getAccountEntriesList` | _(wrapper)_ | **ledger** |
| — | `ledger.js` | `getStatement` | `GET /ledger/accounts/:id/statement` | **ledger** |
| — | `ledger.js` | `getEntry` | `GET /ledger/entries/:id` | **ledger** |
| — | `funding.js` | `createVirtualAccount` | `POST /funding/virtual-accounts` | **funding** |
| — | `funding.js` | `getMyVirtualAccount` | `GET /funding/virtual-accounts/me` | **funding** |
| — | `funding.js` | `createCheckout` | `POST /funding/checkout` | **funding** |
| — | `funding.js` | `getMyDeposits` | `GET /funding/deposits/me` | **funding** |
| — | `funding.js` | `getDeposit` | `GET /funding/deposits/:reference` | **funding** |
| Bills | `bills.js` | `getBillers` | `GET /bills/billers?category=` | **bills** |
| Bills | `bills.js` | `getDataBundles` | _(never specified)_ | **bills** |
| Bills | `bills.js` | `validateCustomer` | `POST /bills/validate-customer` | **bills** |
| Bills | `bills.js` | `pay` | `POST /bills/pay` | **bills** |
| Bills | `bills.js` | `getHistory` | `GET /bills/me` | **bills** |
| Bills | `bills.js` | `getByReference` | `GET /bills/:reference` | **bills** |
| Bills | `bills.js` | `refreshStatus` | `POST /bills/:reference/refresh-status` | **bills** |
| Savings, Dashboard | `savings.js` | `getAll` | `GET /savings` | **savings** |
| Savings | `savings.js` | `create` | `POST /savings` | **savings** |
| Savings | `savings.js` | `topUp` | `POST /savings/:id/topup` | **savings** |
| Savings | `savings.js` | `remove` | `DELETE /savings/:id` | **savings** |
| Cards | `cards.js` | `getCards` | `GET /cards` | **cards** |
| Cards | `cards.js` | `freeze` | `POST /cards/:id/freeze` | **cards** |
| Cards | `cards.js` | `requestPhysical` | `POST /cards/request-physical` | **cards** |
| Cards | `cards.js` | `topUp` | `POST /cards/:id/topup` | **cards** |
| Loans | `loans.js` | `getOffers` | `GET /loans/offers` | **loans** |
| Loans | `loans.js` | `getActive` | `GET /loans/active` | **loans** |
| Loans | `loans.js` | `apply` | `POST /loans/apply` | **loans** |
| Loans | `loans.js` | `repay` | `POST /loans/:id/repay` | **loans** |
| Rewards | `rewards.js` | `getRewards` | `GET /rewards` | **rewards** |
| Rewards | `rewards.js` | `redeem` | `POST /rewards/redeem` | **rewards** |
| Transfer | `beneficiary.js` | `getAll` | `GET /beneficiaries` | **beneficiaries** |
| Transfer | `beneficiary.js` | `save` | `POST /beneficiaries` | **beneficiaries** |
| Transfer | `beneficiary.js` | `remove` | `DELETE /beneficiaries/:id` | **beneficiaries** |
| Profile | `profile.js` | `getNotifications` | `GET /notifications/me` | **notifications** |
| Profile | `profile.js` | `getUnreadCount` | `GET /notifications/me/unread-count` | **notifications** |
| Profile | `profile.js` | `markRead` | `POST /notifications/:id/read` | **notifications** |
| Profile | `profile.js` | `markAllRead` | `POST /notifications/read-all` | **notifications** |
| Profile | `profile.js` | `updateProfile` | `PUT /users/me` | **identity** (endpoint not built) |
| _(unrouted)_ | `auth.js` | `verifyOtp` / `resendOtp` | `POST /auth/verify-otp` | **identity** (not built) |
| _(unrouted)_ | `auth.js` | `setPin` / `verifyPin` | `POST /auth/pin` | **identity** (not built) |

---

## Open contract mismatches

Decisions required before the affected modules are built.

| # | Mismatch | Decision needed |
|---|---|---|
| 1 | **`x-idempotency-key` is sent by the frontend and ignored by the backend.** `shared/constants/index.ts` defines the constant; nothing reads it. The frontend also generates a fresh UUID per call, so it is not idempotent client-side either. | Backend must read the header and de-duplicate. Frontend must generate the key **once per user intent**, not per request. |
| 2 | **No bank-list endpoint.** `transfer.js` hardcodes 20 Nigerian banks. | Either expose `GET /transfers/banks` proxying Flutterwave, or formally accept the static list and document it. |
| 3 | **No name-enquiry endpoint.** Recipient names are typed by hand and never verified. | Expose account-name resolution before external transfers, or accept the misdirected-payment risk explicitly. |
| 4 | **No `PUT /users/me`.** Profile is read-only. | Add to `identity`, or remove the edit affordance from the UI. |
| 5 | **Amount units are inconsistent across pending clients.** `savings.js`, `cards.js` and `loans.js` were written against `*Kobo` integer fields; every live endpoint uses **major-unit decimal strings**. | Standardise on decimal strings when those modules are built. The `*Kobo` naming in pending clients is a leftover and must not set precedent. |
| 6 | **Internal transfers have no UI.** Backend is complete; nothing calls it. | Design a Kudi-to-Kudi recipient picker, which needs a user/account lookup endpoint that does not exist yet. |

---

## Conventions for new modules

Derived from what the live modules already do correctly — follow these.

- **Money:** `BigInt` minor units in the database, major-unit decimal string
  (`"1500.00"`) on the wire. Never a float, never kobo integers in JSON.
- **Lists:** return `{ data: [], meta: { total, page, limit, totalPages } }`.
  Frontend clients unwrap with `response.data ?? response`.
- **Errors:** throw a `DomainException` subclass; `HttpExceptionFilter`
  normalises it to `{ statusCode, error, message, path, timestamp }`.
- **Cross-module calls:** depend on the other module's port (interface + DI
  token), never its internals.
- **Cross-module reactions:** publish a domain event and handle it in the
  consuming module, as `compliance` does for `UserRegisteredEvent`.
- **Concurrency:** every mutable balance-bearing row carries a `version`
  column and is written with a conditional `updateMany`.
