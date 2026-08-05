/**
 * INTERNAL: wallet-to-wallet movement between two Kudi AI Bank
 * accounts, settled synchronously and atomically within our own
 * database. EXTERNAL: an outbound payout to another Nigerian bank via
 * Flutterwave, settled asynchronously (Flutterwave confirms via
 * webhook, sometimes minutes later).
 */
export enum TransferType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}
