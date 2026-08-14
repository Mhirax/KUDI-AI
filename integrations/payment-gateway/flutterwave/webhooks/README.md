# Flutterwave — Webhooks

Inbound webhook handling for asynchronous Flutterwave events.

## Status

Partially implemented.

- `flutterwave-webhook-verifier.util.ts` — constant-time verification
  of the `verif-hash` header Flutterwave sends (a static shared secret,
  not HMAC — see the file's header comment).
- The transfer-completion webhook controller itself lives in
  `modules/transfers/presentation/controllers/flutterwave-transfer-webhook.controller.ts`,
  since handling it requires dispatching into that module's CQRS
  command bus. This directory holds the Flutterwave-specific
  verification concern only, kept separate from the module that
  interprets the payload.
- Funding-webhook handling (wallet top-ups) will be added when the
  Funding capability under `../funding` is implemented.
