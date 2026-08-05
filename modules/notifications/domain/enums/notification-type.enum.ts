/**
 * Thematic classification driving app-side grouping/badging. Additive
 * only — persisted notifications are never reclassified.
 */
export enum NotificationType {
  SECURITY = 'SECURITY',
  TRANSACTION = 'TRANSACTION',
  KYC = 'KYC',
  ACCOUNT = 'ACCOUNT',
}
