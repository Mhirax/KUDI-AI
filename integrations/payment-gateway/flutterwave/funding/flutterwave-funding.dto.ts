/**
 * Raw request/response shapes for Flutterwave's v3 virtual-account,
 * standard-checkout, and transaction-verification APIs. These mirror
 * Flutterwave's own JSON contracts and exist only inside this
 * integration package — modules never see them.
 */

export interface CreateFlutterwaveVirtualAccountRequest {
  email: string;
  tx_ref: string;
  is_permanent: boolean;
  narration: string;
}

export interface FlutterwaveVirtualAccountData {
  account_number: string;
  bank_name: string;
  order_ref: string;
  flw_ref?: string;
}

export interface FlutterwaveVirtualAccountResponse {
  status: 'success' | 'error';
  message: string;
  data?: FlutterwaveVirtualAccountData;
}

export interface InitiateFlutterwavePaymentRequest {
  tx_ref: string;
  amount: string;
  currency: string;
  redirect_url: string;
  customer: {
    email: string;
    name: string;
  };
  customizations?: {
    title?: string;
  };
}

export interface FlutterwavePaymentResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    link: string;
  };
}

export interface FlutterwaveTransactionData {
  id: number;
  tx_ref: string;
  flw_ref?: string;
  amount: number;
  currency: string;
  status: string;
  payment_type?: string;
  customer?: {
    email?: string;
  };
}

export interface FlutterwaveVerifyTransactionResponse {
  status: 'success' | 'error';
  message: string;
  data?: FlutterwaveTransactionData;
}

/** `charge.completed` webhook envelope (checkout and virtual-account credits alike). */
export interface FlutterwaveChargeWebhookPayload {
  event: string;
  data?: FlutterwaveTransactionData;
}
