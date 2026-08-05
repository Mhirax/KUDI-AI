import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { LEDGER_GRPC_PACKAGE } from './ledger-grpc.constants';
import { LedgerServiceClient } from './ledger-grpc.types';

export interface PostDoubleEntryResult {
  transactionId: string;
  debitAccountBalanceMinorUnits: bigint;
  creditAccountBalanceMinorUnits: bigint;
}

/**
 * Application-facing wrapper around the raw gRPC `LedgerServiceClient`.
 * Converts the Observable-per-call gRPC style into `Promise`s (the
 * idiom the rest of this codebase uses everywhere else), parses int64
 * string fields into `bigint` at the boundary — matching `Money`'s
 * own internal representation — and translates gRPC-layer failures
 * into a single `ServiceUnavailableException` (502-equivalent) rather
 * than leaking `RpcException` details to callers who only care "did
 * the ledger engine accept this."
 *
 * This is the ONLY class in the NestJS codebase that talks to the
 * gRPC connection directly; `GrpcInternalTransferExecutor` (Transfers
 * module) and `RegisterLedgerAccountHandler` (Accounts module) both
 * depend on this wrapper, never on `LEDGER_GRPC_PACKAGE` itself.
 */
@Injectable()
export class LedgerEngineClient implements OnModuleInit {
  private readonly logger = new Logger(LedgerEngineClient.name);
  private service: LedgerServiceClient;

  constructor(@Inject(LEDGER_GRPC_PACKAGE) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.service = this.client.getService<LedgerServiceClient>('LedgerService');
  }

  async registerAccount(externalAccountId: string, currency: string): Promise<string> {
    const response = await this.call(() =>
      this.service.registerAccount({ externalAccountId, currency }),
    );
    return response.ledgerAccountId;
  }

  async postDoubleEntry(params: {
    idempotencyKey: string;
    debitExternalAccountId: string;
    creditExternalAccountId: string;
    amountMinorUnits: bigint;
    currency: string;
    narration: string;
  }): Promise<PostDoubleEntryResult> {
    const response = await this.call(() =>
      this.service.postDoubleEntry({
        idempotencyKey: params.idempotencyKey,
        debitExternalAccountId: params.debitExternalAccountId,
        creditExternalAccountId: params.creditExternalAccountId,
        amountMinorUnits: params.amountMinorUnits.toString(),
        currency: params.currency,
        narration: params.narration,
      }),
    );

    return {
      transactionId: response.transactionId,
      debitAccountBalanceMinorUnits: BigInt(response.debitAccountBalanceMinorUnits),
      creditAccountBalanceMinorUnits: BigInt(response.creditAccountBalanceMinorUnits),
    };
  }

  async reverseTransaction(params: {
    originalTransactionId: string;
    idempotencyKey: string;
    narration: string;
  }): Promise<string> {
    const response = await this.call(() =>
      this.service.reverseTransaction({
        originalTransactionId: params.originalTransactionId,
        idempotencyKey: params.idempotencyKey,
        narration: params.narration,
      }),
    );
    return response.reversalTransactionId;
  }

  async getBalance(
    externalAccountId: string,
  ): Promise<{ balanceMinorUnits: bigint; currency: string }> {
    const response = await this.call(() => this.service.getBalance({ externalAccountId }));
    return {
      balanceMinorUnits: BigInt(response.balanceMinorUnits),
      currency: response.currency,
    };
  }

  private async call<T>(fn: () => Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(fn());
    } catch (error) {
      if (error instanceof RpcException) {
        this.logger.error(`ledger-engine RPC failed: ${error.message}`);
      } else {
        this.logger.error(
          `ledger-engine RPC failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw new ServiceUnavailableException('Ledger engine is currently unavailable');
    }
  }
}