import { Money } from '../../../../shared/value-objects/money.vo';
import { BillCategory } from '../enums/bill-category.enum';

export interface Biller {
  billerCode: string;
  /** Provider's per-product code (plan/bouquet/meter type). */
  itemCode: string;
  name: string;
  category: BillCategory;
  /** Fixed price in minor units for fixed-price items (e.g. TV bouquets); null for variable-amount items. */
  fixedAmountMinorUnits: bigint | null;
}

export interface ValidatedBillCustomer {
  isValid: boolean;
  /** Registered customer name at the biller, when the biller returns one. */
  customerName: string | null;
}

export interface BillPaymentExecutionResult {
  providerReference: string;
  /** True when the provider settled the bill synchronously. */
  isImmediatelySettled: boolean;
  /** Provider-issued value token (e.g. prepaid electricity token), when applicable. */
  valueToken: string | null;
}

export interface BillPaymentStatusResult {
  isSuccessful: boolean;
  isFailed: boolean;
  failureReason: string | null;
  valueToken: string | null;
}

/**
 * Domain service port for the bill-payment provider (Flutterwave).
 * Same seam pattern as Funding's IFundingProvider — the concrete
 * implementation wraps /integrations/payment-gateway/flutterwave/bill-payments.
 */
export interface IBillPaymentProvider {
  getBillers(category: BillCategory): Promise<Biller[]>;
  validateCustomer(params: {
    billerCode: string;
    itemCode: string;
    customerIdentifier: string;
  }): Promise<ValidatedBillCustomer>;
  payBill(params: {
    reference: string;
    billerCode: string;
    itemCode: string;
    customerIdentifier: string;
    amount: Money;
  }): Promise<BillPaymentExecutionResult>;
  getStatus(reference: string): Promise<BillPaymentStatusResult>;
}

export const BILL_PAYMENT_PROVIDER = Symbol('BILL_PAYMENT_PROVIDER');
