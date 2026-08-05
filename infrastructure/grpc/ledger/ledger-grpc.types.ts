import { Observable } from 'rxjs';

/**
 * Hand-written TypeScript mirrors of /proto/ledger.proto's message
 * types. NestJS's `@grpc/proto-loader` loads the proto file at
 * runtime (no codegen step), so these interfaces exist purely to give
 * the client call sites type safety — field names and casing must
 * match the .proto file exactly (protobuf's camelCase JS mapping of
 * snake_case fields, per @grpc/proto-loader's default behavior).
 */

export interface RegisterAccountRequest {
  externalAccountId: string;
  currency: string;
}

export interface RegisterAccountResponse {
  ledgerAccountId: string;
}

export interface PostDoubleEntryRequest {
  idempotencyKey: string;
  debitExternalAccountId: string;
  creditExternalAccountId: string;
  amountMinorUnits: string; // int64 fields arrive as strings over @grpc/proto-loader
  currency: string;
  narration: string;
}

export interface PostDoubleEntryResponse {
  transactionId: string;
  debitAccountBalanceMinorUnits: string;
  creditAccountBalanceMinorUnits: string;
}

export interface ReverseTransactionRequest {
  originalTransactionId: string;
  idempotencyKey: string;
  narration: string;
}

export interface ReverseTransactionResponse {
  reversalTransactionId: string;
}

export interface GetBalanceRequest {
  externalAccountId: string;
}

export interface GetBalanceResponse {
  balanceMinorUnits: string;
  currency: string;
}

/**
 * Shape of the raw gRPC service client as `@nestjs/microservices`'
 * `ClientGrpc.getService<T>()` produces it — every RPC method returns
 * an `Observable` of the response (the underlying `@grpc/grpc-js` call
 * wrapped by NestJS). `LedgerEngineClient` (ledger-engine.client.ts)
 * is the Promise-based, application-facing wrapper around this.
 */
export interface LedgerServiceClient {
  registerAccount(request: RegisterAccountRequest): Observable<RegisterAccountResponse>;
  postDoubleEntry(request: PostDoubleEntryRequest): Observable<PostDoubleEntryResponse>;
  reverseTransaction(request: ReverseTransactionRequest): Observable<ReverseTransactionResponse>;
  getBalance(request: GetBalanceRequest): Observable<GetBalanceResponse>;
}
