/**
 * How money entered the platform.
 *
 * - `VIRTUAL_ACCOUNT` — an inbound NIP bank transfer to the customer's
 *   dedicated Flutterwave-issued virtual account number.
 * - `CHECKOUT` — a Flutterwave hosted-checkout payment (card, bank,
 *   USSD, ...) initiated from within the app.
 */
export enum DepositChannel {
  VIRTUAL_ACCOUNT = 'VIRTUAL_ACCOUNT',
  CHECKOUT = 'CHECKOUT',
}
