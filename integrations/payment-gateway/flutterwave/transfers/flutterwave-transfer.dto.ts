/**
 * Request/response shapes for Flutterwave's v3 Transfers API
 * (https://api.flutterwave.com/v3/transfers). Field names mirror
 * Flutterwave's own JSON contract exactly (snake_case) so the mapper
 * has a single, obvious translation boundary — verify against current
 * Flutterwave API docs before production use, as third-party API
 * contracts can change independently of this codebase.
 */

export interface InitiateFlutterwaveTransferRequest {
  account_bank: string; // Nigerian bank code, e.g. "044"
  account_number: string;
  amount: number; // major units (Naira), per Flutterwave's contract
  narration: string;
  currency: string;
  reference: string; // Kudi's own idempotency reference
  callback_url: string;
  debit_currency: string;
}

export type FlutterwaveTransferStatus = 'NEW' | 'PENDING' | 'SUCCESSFUL' | 'FAILED';

export interface FlutterwaveTransferData {
  id: number;
  account_number: string;
  bank_code: string;
  bank_name: string | null;
  full_name: string | null;
  created_at: string;
  currency: string;
  debit_currency: string;
  amount: number;
  fee: number;
  status: FlutterwaveTransferStatus;
  reference: string;
  narration: string;
  complete_message: string | null;
  requires_approval: number;
  is_approved: number;
}

export interface FlutterwaveTransferResponse {
  status: 'success' | 'error';
  message: string;
  data: FlutterwaveTransferData | null;
}

/** Shape of the asynchronous webhook payload Flutterwave POSTs on transfer completion. */
export interface FlutterwaveTransferWebhookPayload {
  event: 'transfer.completed';
  data: FlutterwaveTransferData;
}
