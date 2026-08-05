import { registerAs } from '@nestjs/config';

/**
 * Flutterwave integration configuration. Kudi AI Bank's sole payment
 * provider — see /integrations/payment-gateway/flutterwave.
 */
export default registerAs('flutterwave', () => ({
  baseUrl: process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3',
  publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
  secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
  encryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
  webhookSecretHash: process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
  transferCallbackUrl:
    process.env.FLUTTERWAVE_TRANSFER_CALLBACK_URL ||
    'https://api.kudiaibank.com/webhooks/flutterwave/transfers',
}));
