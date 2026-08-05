# Transfers Presentation Layer

| Method | Path                              | Access                                  |
|--------|-------------------------------------|----------------------------------------------|
| POST   | `/transfers/internal`                  | Any authenticated user (own accounts only)      |
| POST   | `/transfers/external`                     | Any authenticated user (own accounts only)         |
| GET    | `/transfers/me`                              | Any authenticated user                                |
| GET    | `/transfers/:reference`                         | Owner or admin                                           |
| POST   | `/webhooks/flutterwave/transfers`                  | Public — verified via `verif-hash` header, not JWT          |

`FlutterwaveTransferWebhookController` lives in this module (rather
than under `/integrations`) because handling the webhook means
dispatching `ConfirmExternalTransferCommand` into this module's own
CQRS command bus — the Flutterwave-*specific* concerns (signature
verification, DTO shapes) stay in `/integrations/payment-gateway/flutterwave`,
imported from here.
