import {
  FlutterwaveBillersResponse,
  FlutterwaveValidateCustomerResponse,
  CreateFlutterwaveBillPaymentRequest,
  FlutterwaveBillPaymentResponse,
  FlutterwaveBillStatusResponse,
} from './flutterwave-bills.dto';

/**
 * Port isolating callers from the concrete HTTP client for
 * Flutterwave's bills APIs. `modules/bills` depends on this interface
 * (wrapped by its own domain-level `IBillPaymentProvider` port), never
 * on the adapter directly — same seam pattern as ../transfers and
 * ../funding.
 */
export interface IFlutterwaveBillsClient {
  getBillers(flutterwaveCategoryQuery: string): Promise<FlutterwaveBillersResponse>;
  validateCustomer(params: {
    itemCode: string;
    billerCode: string;
    customerIdentifier: string;
  }): Promise<FlutterwaveValidateCustomerResponse>;
  createBillPayment(
    payload: CreateFlutterwaveBillPaymentRequest,
  ): Promise<FlutterwaveBillPaymentResponse>;
  getBillPaymentStatus(reference: string): Promise<FlutterwaveBillStatusResponse>;
}

export const FLUTTERWAVE_BILLS_CLIENT = Symbol('FLUTTERWAVE_BILLS_CLIENT');
