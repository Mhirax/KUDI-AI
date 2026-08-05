/**
 * Raw request/response shapes for Flutterwave's v3 Issuing (virtual
 * cards) APIs. Provider contracts only — modules never see these
 * types directly (see ../bill-payments for the identical convention).
 */

export interface CreateFlutterwaveVirtualCardRequest {
  /** Currency the card is denominated in, e.g. "NGN". */
  currency: string;
  /** Major-unit initial funding amount, debited from the platform's Flutterwave balance at creation time. */
  amount: number;
  /** Whether the card can be funded again after creation. */
  debit_currency: string;
  billing_name: string;
}

export interface FlutterwaveVirtualCardData {
  id?: string;
  account_id?: number;
  card_pan?: string;
  masked_pan?: string;
  first_6digits?: string;
  last_4digits?: string;
  expiration?: string; // "MM/YY"
  currency?: string;
  card_hash?: string;
  callback_url?: string | null;
  amount?: number;
  is_active?: boolean;
  created_at?: string;
}

export interface FlutterwaveVirtualCardResponse {
  status: 'success' | 'error';
  message: string;
  data?: FlutterwaveVirtualCardData;
}

export interface FundFlutterwaveVirtualCardRequest {
  amount: number;
  debit_currency: string;
}

export interface FlutterwaveCardActionResponse {
  status: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}
