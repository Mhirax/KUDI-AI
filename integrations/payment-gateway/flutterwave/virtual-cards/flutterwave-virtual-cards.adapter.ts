import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError, Observable } from 'rxjs';
import { IFlutterwaveVirtualCardsClient } from './flutterwave-virtual-cards.port';
import {
  CreateFlutterwaveVirtualCardRequest,
  FlutterwaveVirtualCardResponse,
  FundFlutterwaveVirtualCardRequest,
  FlutterwaveCardActionResponse,
} from './flutterwave-virtual-cards.dto';

/**
 * Concrete adapter calling Flutterwave's real v3 Issuing (virtual
 * card) APIs — card creation, lookup, funding, block/unblock,
 * termination. The only file that knows these endpoints' HTTP
 * contracts; same conventions as the sibling bill-payments/transfers
 * adapters (error normalization, bearer auth, 15s timeout).
 */
@Injectable()
export class FlutterwaveVirtualCardsAdapter implements IFlutterwaveVirtualCardsClient {
  private readonly logger = new Logger(FlutterwaveVirtualCardsAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createCard(
    payload: CreateFlutterwaveVirtualCardRequest,
  ): Promise<FlutterwaveVirtualCardResponse> {
    return this.request(
      this.httpService.post<FlutterwaveVirtualCardResponse>(
        `${this.baseUrl()}/virtual-cards`,
        payload,
        this.requestConfig(),
      ),
      'virtual card creation',
    );
  }

  async getCard(providerCardId: string): Promise<FlutterwaveVirtualCardResponse> {
    return this.request(
      this.httpService.get<FlutterwaveVirtualCardResponse>(
        `${this.baseUrl()}/virtual-cards/${encodeURIComponent(providerCardId)}`,
        this.requestConfig(),
      ),
      'virtual card lookup',
    );
  }

  async fundCard(
    providerCardId: string,
    payload: FundFlutterwaveVirtualCardRequest,
  ): Promise<FlutterwaveCardActionResponse> {
    return this.request(
      this.httpService.post<FlutterwaveCardActionResponse>(
        `${this.baseUrl()}/virtual-cards/${encodeURIComponent(providerCardId)}/fund`,
        payload,
        this.requestConfig(),
      ),
      'virtual card funding',
    );
  }

  async blockCard(providerCardId: string): Promise<FlutterwaveCardActionResponse> {
    return this.request(
      this.httpService.put<FlutterwaveCardActionResponse>(
        `${this.baseUrl()}/virtual-cards/${encodeURIComponent(providerCardId)}/status/block`,
        {},
        this.requestConfig(),
      ),
      'virtual card block',
    );
  }

  async unblockCard(providerCardId: string): Promise<FlutterwaveCardActionResponse> {
    return this.request(
      this.httpService.put<FlutterwaveCardActionResponse>(
        `${this.baseUrl()}/virtual-cards/${encodeURIComponent(providerCardId)}/status/unblock`,
        {},
        this.requestConfig(),
      ),
      'virtual card unblock',
    );
  }

  async terminateCard(providerCardId: string): Promise<FlutterwaveCardActionResponse> {
    return this.request(
      this.httpService.put<FlutterwaveCardActionResponse>(
        `${this.baseUrl()}/virtual-cards/${encodeURIComponent(providerCardId)}/terminate`,
        {},
        this.requestConfig(),
      ),
      'virtual card termination',
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
          throw new ServiceUnavailableException('Card provider is currently unavailable');
        }),
      ),
    );
    return response.data;
  }
}
