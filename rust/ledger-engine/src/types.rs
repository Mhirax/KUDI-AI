//! Core domain types for the ledger engine's own authoritative
//! storage. These are deliberately distinct Rust types from anything
//! on the NestJS side — the two systems share only the gRPC contract
//! (/proto/ledger.proto), never a data model.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Mirrors a Kudi `Account` aggregate inside the ledger engine's own
/// storage. `id` is this engine's own primary key; `external_account_id`
/// is the foreign (Kudi-side) UUID — kept distinct so this engine never
/// depends on Kudi's ID generation scheme.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LedgerAccount {
    pub id: Uuid,
    pub external_account_id: Uuid,
    pub currency: String,
    pub balance_minor_units: i64,
    pub version: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// The "envelope" of one balanced double-entry transaction: exactly
/// one debit and one credit ledger account, for the same amount and
/// currency.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LedgerTransaction {
    pub id: Uuid,
    pub idempotency_key: String,
    pub debit_ledger_account_id: Uuid,
    pub credit_ledger_account_id: Uuid,
    pub amount_minor_units: i64,
    pub currency: String,
    pub narration: String,
    pub reverses_transaction_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "entry_direction", rename_all = "UPPERCASE")]
pub enum EntryDirection {
    Debit,
    Credit,
}

/// A single immutable ledger line item. Two rows (one DEBIT, one
/// CREDIT) sharing the same `transaction_id` form one balanced
/// transaction — see `repository::post_double_entry`.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LedgerEntry {
    pub id: Uuid,
    pub transaction_id: Uuid,
    pub ledger_account_id: Uuid,
    pub direction: EntryDirection,
    pub amount_minor_units: i64,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}

/// Input parameters for posting a new balanced transaction.
#[derive(Debug, Clone)]
pub struct PostDoubleEntryParams {
    pub idempotency_key: String,
    pub debit_external_account_id: Uuid,
    pub credit_external_account_id: Uuid,
    pub amount_minor_units: i64,
    pub currency: String,
    pub narration: String,
}

/// Result of a successful (or idempotently-replayed) posting.
#[derive(Debug, Clone)]
pub struct PostDoubleEntryResult {
    pub transaction_id: Uuid,
    pub debit_account_balance_minor_units: i64,
    pub credit_account_balance_minor_units: i64,
}
