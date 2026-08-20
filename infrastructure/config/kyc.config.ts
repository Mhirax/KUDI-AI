import { registerAs } from '@nestjs/config';

/**
 * Compliance/KYC module configuration. `identifierHmacKey` protects
 * BVN/NIN digests (see IdentifierHasher) — a high-entropy secret,
 * never checked into version control, distinct from any Flutterwave
 * credential.
 */
export default registerAs('kyc', () => ({
  identifierHmacKey: process.env.KYC_IDENTIFIER_HMAC_KEY,
}));
