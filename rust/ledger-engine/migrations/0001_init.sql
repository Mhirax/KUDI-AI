-- Kudi AI Bank — Ledger Engine schema
--
-- Owned exclusively by this Rust service — NOT managed by Prisma.
-- Each microservice in this platform owns its own tables; the NestJS
-- side never writes to these directly, only via the gRPC contract in
-- /proto/ledger.proto.

CREATE TABLE IF NOT EXISTS ledger_accounts (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Kudi's own Account.id (Prisma/Postgres UUID). Not a foreign key
    -- (deliberately — this service does not share a database schema
    -- with the NestJS side; see the module README).
    external_account_id  UUID NOT NULL UNIQUE,
    currency             TEXT NOT NULL,
    balance_minor_units  BIGINT NOT NULL DEFAULT 0,
    -- Audit counter only. Actual concurrency safety within this
    -- service comes from row-level locking (SELECT ... FOR UPDATE)
    -- in post_double_entry, not this column.
    version              INTEGER NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The "envelope" of one balanced double-entry transaction.
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Caller-supplied idempotency key (e.g. a Kudi Transfer's
    -- reference). Unique constraint is what makes PostDoubleEntry
    -- safely retryable over an unreliable network.
    idempotency_key           TEXT NOT NULL UNIQUE,
    debit_ledger_account_id   UUID NOT NULL REFERENCES ledger_accounts(id),
    credit_ledger_account_id  UUID NOT NULL REFERENCES ledger_accounts(id),
    amount_minor_units        BIGINT NOT NULL CHECK (amount_minor_units > 0),
    currency                  TEXT NOT NULL,
    narration                 TEXT NOT NULL,
    -- Set only on reversal transactions; NULL for original postings.
    reverses_transaction_id   UUID REFERENCES ledger_transactions(id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE entry_direction AS ENUM ('DEBIT', 'CREDIT');

-- Immutable line items. Exactly two rows per ledger_transactions row
-- (one DEBIT, one CREDIT) by construction (see repository.rs) — a
-- database trigger enforcing "exactly 2, opposite directions, equal
-- amounts" as a hard invariant is a natural extension for
-- /rust/reconciliation-engine to verify periodically, not implemented
-- here to keep this service's initial scope bounded.
CREATE TABLE IF NOT EXISTS ledger_entries (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id     UUID NOT NULL REFERENCES ledger_transactions(id),
    ledger_account_id  UUID NOT NULL REFERENCES ledger_accounts(id),
    direction          entry_direction NOT NULL,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    currency           TEXT NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger_account_id ON ledger_entries(ledger_account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_external_account_id ON ledger_accounts(external_account_id);
