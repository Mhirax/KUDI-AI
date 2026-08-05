import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IFundingProvider,
  VirtualAccountCreationResult,
  CheckoutInitiationResult,
  VerifiedProviderTransaction,
} from '../../domain/services/funding-provider.interface';
import { FundingProviderException } from '../../domain/exceptions/funding-provider.exception';
import { Money } from '../../../../shared/value-objects/money.vo';
import { APP_NAME } from '../../../../shared/constants';
import {
  FLUTTERWAVE_FUNDING_CLIENT,
  IFlutterwaveFundingClient,
} from '../../../../integrations/payment-gateway/flutterwave/funding/flutterwave-funding.port';
import { FlutterwaveFundingMapper } from '../../../../integrations/payment-gateway/flutterwave/funding/flutterwave-funding.mapper';

/**
 * Implements the Funding module's `IFundingProvider` port by
 * delegating to the Flutterwave integration adapter — the seam between
 * "Funding needs an inbound account number / payment link / verified
 * transaction" and "here is exactly how Flutterwave's API works".
 * Mirror of Transfers' FlutterwavePayoutProvider.
 */
@Injectable()
export class FlutterwaveFundingProvider implements IFundingProvider {
  constructor(
    @Inject(FLUTTERWAVE_FUNDING_CLIENT) private readonly client: IFlutterwaveFundingClient,
    private readonly configService: ConfigService,
  ) {}

  async createVirtualAccount(params: {
    reference: string;
    userEmail: string;
    userFullName: string;
    narration: string;
  }): Promise<VirtualAccountCreationResult> {
    const response = await this.client.createVirtualAccountNumber({
      email: params.userEmail,
      tx_ref: params.reference,
      is_permanent: true,
      narration: params.narration,
    });

    if (response.status !== 'success' || !response.data) {
      throw new FundingProviderException(response.message);
    }

    return {
      virtualAccountNumber: response.data.account_number,
      bankName: response.data.bank_name,
    };
  }

  async initiateCheckout(params: {
    reference: string;
    amount: Money;
    userEmail: string;
    userFullName: string;
  }): Promise<CheckoutInitiationResult> {
    const response = await this.client.initiatePayment({
      tx_ref: params.reference,
      amount: params.amount.toMajorUnitsString(),
      currency: params.amount.getCurrency(),
      redirect_url: this.configService.get<string>(
        'flutterwave.checkoutRedirectUrl',
        'https://app.kudiaibank.com/funding/checkout/complete',
      ),
      customer: { email: params.userEmail, name: params.userFullName },
      customizations: { title: `${APP_NAME} wallet funding` },
    });

    if (response.status !== 'success' || !response.data) {
      throw new FundingProviderException(response.message);
    }

    return { paymentLink: response.data.link };
  }

  async verifyTransaction(providerTransactionId: string): Promise<VerifiedProviderTransaction> {
    const response = await this.client.verifyTransaction(providerTransactionId);

    if (response.status !== 'success' || !response.data) {
      throw new FundingProviderException(response.message);
    }

    return {
      providerTransactionId: FlutterwaveFundingMapper.extractProviderTransactionId(response.data),
      reference: response.data.tx_ref,
      amountMinorUnits: FlutterwaveFundingMapper.amountToMinorUnits(response.data.amount),
      currency: response.data.currency,
      isSuccessful: FlutterwaveFundingMapper.isTerminalSuccess(response.data),
    };
  }
}
