import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError, Observable } from 'rxjs';
import { IFlutterwaveBillsClient } from './flutterwave-bills.port';
import {
  FlutterwaveBillersResponse,
  FlutterwaveValidateCustomerResponse,
  CreateFlutterwaveBillPaymentRequest,
  FlutterwaveBillPaymentResponse,
  FlutterwaveBillStatusResponse,
} from './flutterwave-bills.dto';

/**
 * Concrete adapter calling Flutterwave's real v3 bills APIs — biller
 * catalogue, customer validation, bill creation, status requery. The
 * only file that knows these endpoints' HTTP contracts; same
 * conventions as the sibling transfer/funding adapters.
 */
@Injectable()
export class FlutterwaveBillsAdapter implements IFlutterwaveBillsClient {
  private readonly logger = new Logger(FlutterwaveBillsAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getBillers(flutterwaveCategoryQuery: string): Promise<FlutterwaveBillersResponse> {
    return this.request(
      this.httpService.get<FlutterwaveBillersResponse>(
        `${this.baseUrl()}/bill-categories?${flutterwaveCategoryQuery}`,
        this.requestConfig(),
      ),
      'biller catalogue lookup',
    );
  }

  async validateCustomer(params: {
    itemCode: string;
    billerCode: string;
    customerIdentifier: string;
  }): Promise<FlutterwaveValidateCustomerResponse> {
    const query = `code=${encodeURIComponent(params.billerCode)}&customer=${encodeURIComponent(params.customerIdentifier)}`;
    return this.request(
      this.httpService.get<FlutterwaveValidateCustomerResponse>(
        `${this.baseUrl()}/bill-items/${encodeURIComponent(params.itemCode)}/validate?${query}`,
        this.requestConfig(),
      ),
      'bill customer validation',
    );
  }

  async createBillPayment(
    payload: CreateFlutterwaveBillPaymentRequest,
  ): Promise<FlutterwaveBillPaymentResponse> {
    return this.request(
      this.httpService.post<FlutterwaveBillPaymentResponse>(
        `${this.baseUrl()}/bills`,
        payload,
        this.requestConfig(),
      ),
      'bill payment creation',
    );
  }

  async getBillPaymentStatus(reference: string): Promise<FlutterwaveBillStatusResponse> {
    return this.request(
      this.httpService.get<FlutterwaveBillStatusResponse>(
        `${this.baseUrl()}/bills/${encodeURIComponent(reference)}`,
        this.requestConfig(),
      ),
      'bill payment status lookup',
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
          throw new ServiceUnavailableException('Bill provider is currently unavailable');
        }),
      ),
    );
    return response.data;
  }
}
