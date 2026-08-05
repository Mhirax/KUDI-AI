/**
 * Raw request/response shapes for Flutterwave's v3 bills APIs. Provider
 * contracts only — modules never see these types.
 */

export interface FlutterwaveBillerItem {
  id: number;
  biller_code: string;
  item_code: string;
  name: string;
  biller_name: string;
  amount: number;
  /** e.g. "AIRTIME", "MOBILEDATA", "CABLEBILLS", "UTILITYBILLS", "INTBILLS" */
  biller_category?: string;
  country: string;
}

export interface FlutterwaveBillersResponse {
  status: 'success' | 'error';
  message: string;
  data?: FlutterwaveBillerItem[];
}

export interface FlutterwaveValidateCustomerResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    response_code?: string;
    name?: string | null;
    customer?: string;
  };
}

export interface CreateFlutterwaveBillPaymentRequest {
  country: string;
  customer: string;
  amount: string;
  type: string;
  reference: string;
  biller_code?: string;
  item_code?: string;
}

export interface FlutterwaveBillPaymentData {
  phone_number?: string;
  amount?: number;
  network?: string;
  flw_ref?: string;
  tx_ref?: string;
  reference?: string | null;
  /** Prepaid electricity/value token when the biller issues one. */
  token?: string | null;
}

export interface FlutterwaveBillPaymentResponse {
  status: 'success' | 'error';
  message: string;
  data?: FlutterwaveBillPaymentData;
}

export interface FlutterwaveBillStatusResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    currency?: string;
    customer_id?: string;
    frequency?: string;
    amount?: string | number;
    product?: string;
    product_name?: string;
    commission?: number;
    transaction_date?: string;
    country?: string;
    tx_ref?: string;
    extra?: string | null;
    product_details?: string;
    status?: string;
  };
}
