import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError } from 'rxjs';
import { IFlutterwaveVerificationClient } from './flutterwave-verification.port';
import {
  FlutterwaveBvnData,
  FlutterwaveNinData,
  FlutterwaveVerificationResponse,
} from './flutterwave-verification.dto';

/**
 * Concrete adapter calling Flutterwave's real v3 KYC resolution
 * endpoints. This is the only file in the platform that knows the
 * exact URL paths and auth scheme for BVN/NIN lookups.
 */
@Injectable()
export class FlutterwaveVerificationAdapter implements IFlutterwaveVerificationClient {
  private readonly logger = new Logger(FlutterwaveVerificationAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async resolveBvn(bvn: string): Promise<FlutterwaveVerificationResponse<FlutterwaveBvnData>> {
    return this.get<FlutterwaveBvnData>(`/kyc/bvns/${bvn}`);
  }

  async resolveNin(nin: string): Promise<FlutterwaveVerificationResponse<FlutterwaveNinData>> {
    return this.get<FlutterwaveNinData>(`/kyc/nin/${nin}`);
  }

  private async get<T>(path: string): Promise<FlutterwaveVerificationResponse<T>> {
    const baseUrl = this.configService.get<string>('flutterwave.baseUrl');
    const secretKey = this.configService.get<string>('flutterwave.secretKey');

    const response = await firstValueFrom(
      this.httpService
        .get<FlutterwaveVerificationResponse<T>>(`${baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
          timeout: 15000,
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Flutterwave verification lookup failed: ${error.message}`, error.stack);
            throw new ServiceUnavailableException('Verification provider is currently unavailable');
          }),
        ),
    );

    return response.data;
  }
}
