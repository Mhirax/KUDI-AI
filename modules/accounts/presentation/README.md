# Accounts Presentation Layer

`AccountsController` exposes:

| Method | Path                        | Access                                  |
|--------|-------------------------------|--------------------------------------------|
| POST   | `/accounts`                     | Any authenticated user (opens their own)     |
| GET    | `/accounts/me`                    | Any authenticated user                         |
| GET    | `/accounts/:accountId`               | Owner or admin (enforced in query handler)       |
| POST   | `/accounts/:accountId/credit`           | Admin/Super Admin only                              |
| POST   | `/accounts/:accountId/debit`               | Admin/Super Admin only                                 |
| POST   | `/accounts/:accountId/freeze`                 | Admin/Super Admin/Compliance Officer                      |
| POST   | `/accounts/:accountId/unfreeze`                  | Admin/Super Admin only                                        |
| POST   | `/accounts/:accountId/close`                        | Owner or admin                                                    |

Credit/debit are intentionally admin-only in this phase — real
customer-facing money movement (funding, P2P transfers) is dispatched
*internally* by the Transfers/Funding module (a later phase), not
called directly over HTTP by end users. These endpoints exist for
operational/back-office use (manual adjustments, reversals).
