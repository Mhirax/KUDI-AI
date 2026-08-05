import { Inject, Injectable } from '@nestjs/common';
import {
  IBillPaymentProvider,
  Biller,
  ValidatedBillCustomer,
  BillPaymentExecutionResult,
  BillPaymentStatusResult,
} from '../../domain/services/bill-payment-provider.interface';
import { BillCategory } from '../../domain/enums/bill-category.enum';
import { BillProviderException } from '../../domain/exceptions/bill-provider.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import {
  FLUTTERWAVE_BILLS_CLIENT,
  IFlutterwaveBillsClient,
} from '../../../../integrations/payment-gateway/flutterwave/bill-payments/flutterwave-bills.port';
import { FlutterwaveBillsMapper } from '../../../../integrations/payment-gateway/flutterwave/bill-payments/flutterwave-bills.mapper';

/**
 * Implements the Bills module's `IBillPaymentProvider` port by
 * delegating to the Flutterwave integration adapter — mirror of
 * Funding's FlutterwaveFundingProvider.
 */
@Injectable()
export class FlutterwaveBillPaymentProvider implements IBillPaymentProvider {
  constructor(@Inject(FLUTTERWAVE_BILLS_CLIENT) private readonly client: IFlutterwaveBillsClient) {}

  async getBillers(category: BillCategory): Promise<Biller[]> {
    const response = await this.client.getBillers(
      FlutterwaveBillsMapper.toCatalogueQuery(category),
    );

    if (response.status !== 'success' || !response.data) {
      throw new BillProviderException(response.message);
    }

    return response.data.map(
      (item) => FlutterwaveBillsMapper.toBillerItem(item, category) as Biller,
    );
  }

  async validateCustomer(params: {
    billerCode: string;
    itemCode: string;
    customerIdentifier: string;
  }): Promise<ValidatedBillCustomer> {
    const response = await this.client.validateCustomer(params);

    const isValid = FlutterwaveBillsMapper.isValidationSuccessful(
      response.data?.response_code,
      response.status,
    );

    return {
      isValid,
      customerName: response.data?.name ?? null,
    };
  }

  async payBill(params: {
    reference: string;
    billerCode: string;
    itemCode: string;
    customerIdentifier: string;
    amount: Money;
  }): Promise<BillPaymentExecutionResult> {
    const response = await this.client.createBillPayment({
      country: 'NG',
      customer: params.customerIdentifier,
      amount: params.amount.toMajorUnitsString(),
      type: params.itemCode,
      reference: params.reference,
      biller_code: params.billerCode,
      item_code: params.itemCode,
    });

    if (response.status !== 'success' || !response.data) {
      throw new BillProviderException(response.message);
    }

    return {
      providerReference: FlutterwaveBillsMapper.extractProviderReference(response.data),
      // Flutterwave settles most bill payments synchronously; a
      // 'success' envelope with data is treated as settled unless the
      // requery endpoint later says otherwise.
      isImmediatelySettled: true,
      valueToken: response.data.token ?? null,
    };
  }

  async getStatus(reference: string): Promise<BillPaymentStatusResult> {
    const response = await this.client.getBillPaymentStatus(reference);

    if (response.status !== 'success' || !response.data) {
      throw new BillProviderException(response.message);
    }

    const providerStatus = response.data.status;
    return {
      isSuccessful: FlutterwaveBillsMapper.isTerminalSuccessStatus(providerStatus),
      isFailed: FlutterwaveBillsMapper.isTerminalFailureStatus(providerStatus),
      failureReason: FlutterwaveBillsMapper.isTerminalFailureStatus(providerStatus)
        ? `Provider reported status: ${providerStatus}`
        : null,
      valueToken: response.data.extra ?? null,
    };
  }
}
