# Flutterwave Integration

Sole payment provider integration for Kudi AI Bank. Encapsulates all
Flutterwave API interaction behind well-defined ports so application
services never depend on the Flutterwave SDK/HTTP client directly.

## Structure

- `funding/` — wallet/account funding (card, bank transfer, USSD)
- `transfers/` — outbound transfers/payouts
- `virtual-cards/` — virtual card issuance and management
- `bill-payments/` — bill/utility payment processing
- `verification/` — BVN/NIN/KYC verification
- `webhooks/` — inbound Flutterwave webhook handling and signature verification
- `settlement/` — settlement report ingestion and matching

## Status

Phase 1 — Structure only. No client implementation, credentials, or
business logic included yet.
