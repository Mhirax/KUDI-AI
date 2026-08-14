import { Inject, Injectable } from '@nestjs/common';
import {
  IIdentityVerificationProvider,
  IdentityVerificationResult,
} from '../../domain/services/identity-verification-provider.interface';
import {
  FLUTTERWAVE_VERIFICATION_CLIENT,
  IFlutterwaveVerificationClient,
} from '../../../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.port';
import { FlutterwaveVerificationMapper } from '../../../../integrations/payment-gateway/flutterwave/verification/flutterwave-verification.mapper';
import { VerificationProviderException } from '../../domain/exceptions/verification-provider.exception';

/**
 * Implements the Compliance module's own `IIdentityVerificationProvider`
 * port by delegating to the Flutterwave integration adapter — the same
 * seam pattern as `FlutterwavePayoutProvider` in the Transfers module.
 */
@Injectable()
export class FlutterwaveIdentityVerificationProvider implements IIdentityVerificationProvider {
  constructor(
    @Inject(FLUTTERWAVE_VERIFICATION_CLIENT) private readonly client: IFlutterwaveVerificationClient,
  ) {}

  async verifyBvn(params: {
    bvn: string;
    expectedFirstName: string;
    expectedLastName: string;
  }): Promise<IdentityVerificationResult> {
    const response = await this.client.resolveBvn(params.bvn);

    if (response.status !== 'success' || !response.data) {
      throw new VerificationProviderException(response.message);
    }

    const matched = FlutterwaveVerificationMapper.namesMatch(
      response.data,
      params.expectedFirstName,
      params.expectedLastName,
    );

    return {
      matched,
      verifiedFullName: matched ? FlutterwaveVerificationMapper.fullName(response.data) : null,
    };
  }

  async verifyNin(params: {
    nin: string;
    expectedFirstName: string;
    expectedLastName: string;
  }): Promise<IdentityVerificationResult> {
    const response = await this.client.resolveNin(params.nin);

    if (response.status !== 'success' || !response.data) {
      throw new VerificationProviderException(response.message);
    }

    const matched = FlutterwaveVerificationMapper.namesMatch(
      response.data,
      params.expectedFirstName,
      params.expectedLastName,
    );

    return {
      matched,
      verifiedFullName: matched ? FlutterwaveVerificationMapper.fullName(response.data) : null,
    };
  }
}
