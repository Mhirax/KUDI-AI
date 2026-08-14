/**
 * Flutterwave webhooks are authenticated via a static shared-secret
 * header (`verif-hash`), not HMAC — Flutterwave sends back exactly the
 * value configured in the dashboard, and the receiver must do a
 * constant-time comparison against its own copy. This is Flutterwave's
 * actual (simpler than most providers) webhook auth scheme; verify
 * against current docs before relying on it in production.
 */
import { timingSafeEqual } from 'crypto';

export class FlutterwaveWebhookVerifier {
  static isValid(
    receivedHeaderValue: string | undefined,
    configuredSecretHash: string | undefined,
  ): boolean {
    if (!receivedHeaderValue || !configuredSecretHash) {
      return false;
    }

    const received = Buffer.from(receivedHeaderValue);
    const expected = Buffer.from(configuredSecretHash);

    if (received.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(received, expected);
  }
}
