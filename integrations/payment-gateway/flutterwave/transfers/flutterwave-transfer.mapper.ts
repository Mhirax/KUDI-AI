import { InitiateFlutterwaveTransferRequest, FlutterwaveTransferData } from './flutterwave-transfer.dto';

export interface KudiPayoutRequest {
  bankCode: string;
  accountNumber: string;
  amountMajorUnits: string; // decimal string, e.g. "1500.00"
  currency: string;
  reference: string;
  narration: string;
  callbackUrl: string;
}

/**
 * Translates between Kudi's internal payout request shape and
 * Flutterwave's exact wire format, keeping the snake_case/major-unit
 * peculiarities of Flutterwave's API out of the domain and application
 * layers entirely.
 */
export class FlutterwaveTransferMapper {
  static toProviderRequest(request: KudiPayoutRequest): InitiateFlutterwaveTransferRequest {
    return {
      account_bank: request.bankCode,
      account_number: request.accountNumber,
      // Flutterwave's JSON contract requires a numeric amount in major
      // units; this is the one intentional, unavoidable float boundary
      // in the entire payout path — the internal `Money` VO upstream
      // has already validated this to at most 2 decimal places, so no
      // precision is at risk crossing into the wire format here.
      amount: Number(request.amountMajorUnits),
      narration: request.narration,
      currency: request.currency,
      reference: request.reference,
      callback_url: request.callbackUrl,
      debit_currency: request.currency,
    };
  }

  static extractProviderReference(data: FlutterwaveTransferData): string {
    return String(data.id);
  }

  static isTerminalSuccess(data: FlutterwaveTransferData): boolean {
    return data.status === 'SUCCESSFUL';
  }

  static isTerminalFailure(data: FlutterwaveTransferData): boolean {
    return data.status === 'FAILED';
  }
}
