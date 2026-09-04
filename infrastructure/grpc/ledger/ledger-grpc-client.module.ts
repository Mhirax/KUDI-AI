import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import ledgerEngineConfig from '../../config/ledger-engine.config';
import { LedgerEngineClient } from './ledger-engine.client';
import { LEDGER_GRPC_PACKAGE } from './ledger-grpc.constants';

// Re-exported so existing import paths keep working. The declaration
// itself lives in ./ledger-grpc.constants to avoid a circular import
// with ./ledger-engine.client — see the comment in that file.
export { LEDGER_GRPC_PACKAGE };

/**
 * Registers the low-level gRPC connection to the Rust ledger-engine,
 * loading /proto/ledger.proto directly (no codegen step — NestJS uses
 * `@grpc/proto-loader` to parse it at runtime). Exports
 * `LedgerEngineClient`, the Promise-based wrapper application code
 * actually depends on; nothing outside this module should inject the
 * raw `LEDGER_GRPC_PACKAGE` client.
 */
@Module({
  imports: [
    ConfigModule.forFeature(ledgerEngineConfig),
    ClientsModule.registerAsync([
      {
        name: LEDGER_GRPC_PACKAGE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'kudi.ledger.v1',
            // Resolved from the project root (process.cwd()), not from
            // __dirname. The .proto lives at <root>/proto/ledger.proto and
            // is NOT copied into dist/ by the Nest build, so a
            // __dirname-relative path resolves to dist/proto/ledger.proto
            // and fails with ENOENT in both dev and built runs.
            protoPath: join(process.cwd(), 'proto', 'ledger.proto'),
            url: configService.get<string>('ledgerEngine.url', 'localhost:50051'),
            // Explicit rather than relying on @grpc/proto-loader's
            // defaults: int64 fields (all the minor-unit amounts in
            // this contract) must arrive as strings, never as JS
            // `number` (which loses precision above 2^53) or an
            // ambiguous `Long` object.
            loader: {
              longs: String,
              enums: String,
              defaults: true,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  providers: [LedgerEngineClient],
  exports: [LedgerEngineClient],
})
export class LedgerGrpcClientModule {}
