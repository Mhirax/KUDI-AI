-- Invalidate BVN/NIN identifiers hashed with the old unkeyed SHA-256
-- digest before HMAC-SHA256 (KYC_IDENTIFIER_HMAC_KEY) replaces it as the
-- hashing algorithm in modules/compliance. An old unkeyed digest is not
-- comparable to a new keyed one for the same raw identifier, so it can't
-- be silently carried forward — any profile that had one is reset and
-- must re-verify.
--
-- No schema/column change: both algorithms produce a 64-character hex
-- digest into the same bvnHash/ninHash String columns.
--
-- At the time this migration was written, zero kyc_profiles rows had a
-- bvnHash or ninHash value (test-data-only stage) — written for
-- correctness, not because it was observed to change existing data. If
-- this is ever applied against a database with real verified profiles,
-- treat the resulting forced re-verification and any already-activated
-- account as requiring its own customer-communication/compliance-review
-- plan, not something a raw migration alone should silently handle.
UPDATE kyc_profiles
SET
  "bvnVerifiedAt" = NULL,
  "bvnHash" = NULL,
  "bvnMasked" = NULL,
  "ninVerifiedAt" = NULL,
  "ninHash" = NULL,
  "ninMasked" = NULL,
  tier = 'TIER_1',
  version = version + 1,
  "updatedAt" = now()
WHERE "bvnHash" IS NOT NULL OR "ninHash" IS NOT NULL;
