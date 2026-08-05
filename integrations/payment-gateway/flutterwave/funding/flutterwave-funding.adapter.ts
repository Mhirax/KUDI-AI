import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError, Observable } from 'rxjs';
import { IFlutterwaveFundingClient } from './flutterwave-funding.port';
import {
  CreateFlutterwaveVirtualAccountRequest,
  FlutterwaveVirtualAccountResponse,
  InitiateFlutterwavePaymentRequest,
  FlutterwavePaymentResponse,
  FlutterwaveVerifyTransactionResponse,
} from './flutterwave-funding.dto';

/**
 * Concrete adapter calling Flutterwave's real v3 funding-side APIs
 * (virtual account numbers, standard checkout, transaction
 * verification). This is the only file that knows these endpoints'
 * HTTP contracts — everything upstream talks to
 * `IFlutterwaveFundingClient` instead. Same conventions as
 * ../transfers/flutterwave-transfer.adapter.ts (bearer auth, 15s
 * timeout, availability errors surfaced as 503).
 */
@Injectable()
export class FlutterwaveFundingAdapter implements IFlutterwaveFundingClient {
  private readonly logger = new Logger(FlutterwaveFundingAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createVirtualAccountNumber(
    payload: CreateFlutterwaveVirtualAccountRequest,
  ): Promise<FlutterwaveVirtualAccountResponse> {
    return this.request(
      this.httpService.post<FlutterwaveVirtualAccountResponse>(
        `${this.baseUrl()}/virtual-account-numbers`,
        payload,
        this.requestConfig(),
      ),
      'virtual account creation',
    );
  }

  async initiatePayment(
    payload: InitiateFlutterwavePaymentRequest,
  ): Promise<FlutterwavePaymentResponse> {
    return this.request(
      this.httpService.post<FlutterwavePaymentResponse>(
        `${this.baseUrl()}/payments`,
        payload,
        this.requestConfig(),
      ),
      'payment initiation',
    );
  }

  async verifyTransaction(transactionId: string): Promise<FlutterwaveVerifyTransactionResponse> {
    return this.request(
      this.httpService.get<FlutterwaveVerifyTransactionResponse>(
        `${this.baseUrl()}/transactions/${transactionId}/verify`,
        this.requestConfig(),
      ),
      'transaction verification',
    );
  }

  private baseUrl(): string {
    return this.configService.get<string>('flutterwave.baseUrl', 'https://api.flutterwave.com/v3');
  }

  private requestConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.configService.get<string>('flutterwave.secretKey')}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    };
  }

  private async request<T>(observable: Observable<{ data: T }>, operation: string): Promise<T> {
    const response = await firstValueFrom(
      observable.pipe(
        catchError((error: AxiosError) => {
          this.logger.error(`Flutterwave ${operation} failed: ${error.message}`, error.stack);
          throw new ServiceUnavailableException('Funding provider is currently unavailable');
        }),
      ),
    );
    return response.data;
  }
}
