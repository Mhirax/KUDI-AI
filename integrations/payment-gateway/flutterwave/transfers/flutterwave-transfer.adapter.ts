import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError } from 'rxjs';
import { IFlutterwaveTransferClient } from './flutterwave-transfer.port';
import {
  InitiateFlutterwaveTransferRequest,
  FlutterwaveTransferResponse,
} from './flutterwave-transfer.dto';

/**
 * Concrete adapter calling Flutterwave's real v3 Transfers API. This is
 * the *only* file in the platform that knows Flutterwave's HTTP
 * contract, base URL, and auth header scheme — everything upstream
 * talks to `IFlutterwaveTransferClient` instead.
 */
@Injectable()
export class FlutterwaveTransferAdapter implements IFlutterwaveTransferClient {
  private readonly logger = new Logger(FlutterwaveTransferAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async initiateTransfer(
    payload: InitiateFlutterwaveTransferRequest,
  ): Promise<FlutterwaveTransferResponse> {
    const baseUrl = this.configService.get<string>('flutterwave.baseUrl');
    const secretKey = this.configService.get<string>('flutterwave.secretKey');

    const response = await firstValueFrom(
      this.httpService
        .post<FlutterwaveTransferResponse>(`${baseUrl}/transfers`, payload, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Flutterwave transfer initiation failed: ${error.message}`,
              error.stack,
            );
            throw new ServiceUnavailableException('Payout provider is currently unavailable');
          }),
        ),
    );

    return response.data;
  }

  async getTransferStatus(flutterwaveTransferId: string): Promise<FlutterwaveTransferResponse> {
    const baseUrl = this.configService.get<string>('flutterwave.baseUrl');
    const secretKey = this.configService.get<string>('flutterwave.secretKey');

    const response = await firstValueFrom(
      this.httpService
        .get<FlutterwaveTransferResponse>(`${baseUrl}/transfers/${flutterwaveTransferId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
          timeout: 15000,
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Flutterwave transfer status lookup failed: ${error.message}`,
              error.stack,
            );
            throw new ServiceUnavailableException('Payout provider is currently unavailable');
          }),
        ),
    );

    return response.data;
  }
}
