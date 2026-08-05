import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AccountOpenedEvent } from '../../domain/events/account-opened.event';
import { LedgerEngineClient } from '../../../../infrastructure/grpc/ledger/ledger-engine.client';

/**
 * Registers a mirrored ledger account with the Rust ledger-engine
 * whenever a Kudi `Account` is opened — see
 * /rust/ledger-engine/src/repository.rs's `register_account`, which
 * is itself idempotent, so a redelivered event is harmless.
 *
 * A no-op when `LEDGER_ENGINE_ENABLED` is false, matching
 * `GrpcInternalTransferExecutor`'s own rollout switch (Transfers
 * module) — the two must be toggled together, since posting a
 * transfer through the ledger engine only makes sense once every
 * account it can reference has actually been registered there.
 */
@Injectable()
@EventsHandler(AccountOpenedEvent)
export class RegisterLedgerAccountHandler implements IEventHandler<AccountOpenedEvent> {
  private readonly logger = new Logger(RegisterLedgerAccountHandler.name);

  constructor(
    private readonly ledgerEngineClient: LedgerEngineClient,
    private readonly configService: ConfigService,
  ) {}

  async handle(event: AccountOpenedEvent): Promise<void> {
    if (!this.configService.get<boolean>('ledgerEngine.enabled', false)) {
      return;
    }

    try {
      await this.ledgerEngineClient.registerAccount(event.aggregateId, event.currency);
    } catch (error) {
      // Do not let a ledger-engine outage block account opening —
      // log for operational visibility. A missing ledger-account
      // registration will surface loudly the first time a transfer
      // against this account is attempted through
      // GrpcInternalTransferExecutor, which is an acceptable trade-off
      // versus coupling account creation's success to the ledger
      // engine's availability.
      this.logger.error(
        `Failed to register ledger account for Kudi account ${event.aggregateId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
