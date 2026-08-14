# Compliance Infrastructure Layer

- `persistence/prisma-kyc-profile.repository.ts` — implements
  `IKycProfileRepository` with the same optimistic-concurrency pattern
  used by Accounts and Transfers.
- `services/flutterwave-identity-verification-provider.service.ts` —
  implements `IIdentityVerificationProvider` by delegating to the
  Flutterwave integration adapter
  (`/integrations/payment-gateway/flutterwave/verification`).
- `mappers/kyc-profile.mapper.ts` — Prisma ⇄ domain translation. Note
  what it does *not* do: there is no raw BVN/NIN field to map, because
  none is ever persisted — only the hash and masked form the domain
  entity already produced.
