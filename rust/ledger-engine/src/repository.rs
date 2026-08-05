//! Data-access layer for the ledger engine, backed by `sqlx` against
//! this service's own PostgreSQL tables (see /migrations/0001_init.sql).
//!
//! Deliberately uses `sqlx`'s runtime-checked query API (`query`,
//! `query_as`) rather than the compile-time `query!`/`query_as!`
//! macros, which require a live database connection (or a cached
//! `.sqlx` directory) to even compile. The runtime API is fully
//! supported and idiomatic sqlx usage; it trades compile-time SQL
//! validation for the ability to build this service without a
//! database dependency in every environment that compiles it.

use chrono::Utc;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::error::EngineError;
use crate::types::{
    EntryDirection, LedgerAccount, LedgerTransaction, PostDoubleEntryParams, PostDoubleEntryResult,
};

const ACCOUNT_COLUMNS: &str =
    "id, external_account_id, currency, balance_minor_units, version, created_at, updated_at";

const TRANSACTION_COLUMNS: &str = "id, idempotency_key, debit_ledger_account_id, credit_ledger_account_id, \
     amount_minor_units, currency, narration, reverses_transaction_id, created_at";

/// Registers a new ledger account. Idempotent: if an account already
/// exists for `external_account_id`, the existing row is returned
/// rather than raising a conflict — account registration may be
/// safely retried (e.g. if the caller's event handler redelivers).
pub async fn register_account(
    pool: &PgPool,
    external_account_id: Uuid,
    currency: &str,
) -> Result<LedgerAccount, EngineError> {
    if let Some(existing) = find_account_by_external_id(pool, external_account_id).await? {
        return Ok(existing);
    }

    let query = format!(
        "INSERT INTO ledger_accounts (external_account_id, currency) VALUES ($1, $2) \
         ON CONFLICT (external_account_id) DO NOTHING \
         RETURNING {ACCOUNT_COLUMNS}"
    );

    let result = sqlx::query_as::<_, LedgerAccount>(&query)
        .bind(external_account_id)
        .bind(currency)
        .fetch_optional(pool)
        .await?;

    match result {
        Some(account) => Ok(account),
        // Lost the race against a concurrent registration — fetch what
        // the other request created.
        None => find_account_by_external_id(pool, external_account_id)
            .await?
            .ok_or_else(|| {
                EngineError::Internal(format!(
                    "account registration for {external_account_id} conflicted but no row was found"
                ))
            }),
    }
}

pub async fn find_account_by_external_id(
    pool: &PgPool,
    external_account_id: Uuid,
) -> Result<Option<LedgerAccount>, EngineError> {
    let query = format!("SELECT {ACCOUNT_COLUMNS} FROM ledger_accounts WHERE external_account_id = $1");

    let account = sqlx::query_as::<_, LedgerAccount>(&query)
        .bind(external_account_id)
        .fetch_optional(pool)
        .await?;

    Ok(account)
}

async fn find_account_by_id(pool: &PgPool, id: Uuid) -> Result<LedgerAccount, EngineError> {
    let query = format!("SELECT {ACCOUNT_COLUMNS} FROM ledger_accounts WHERE id = $1");

    let account = sqlx::query_as::<_, LedgerAccount>(&query)
        .bind(id)
        .fetch_one(pool)
        .await?;

    Ok(account)
}

pub async fn get_balance(
    pool: &PgPool,
    external_account_id: Uuid,
) -> Result<(i64, String), EngineError> {
    let account = find_account_by_external_id(pool, external_account_id)
        .await?
        .ok_or_else(|| EngineError::AccountNotFound(external_account_id.to_string()))?;

    Ok((account.balance_minor_units, account.currency))
}

async fn find_transaction_by_idempotency_key(
    tx: &mut Transaction<'_, Postgres>,
    idempotency_key: &str,
) -> Result<Option<LedgerTransaction>, EngineError> {
    let query = format!("SELECT {TRANSACTION_COLUMNS} FROM ledger_transactions WHERE idempotency_key = $1");

    let existing = sqlx::query_as::<_, LedgerTransaction>(&query)
        .bind(idempotency_key)
        .fetch_optional(&mut **tx)
        .await?;

    Ok(existing)
}

/// Locks a ledger account row for the duration of the current
/// transaction via `SELECT ... FOR UPDATE`, guaranteeing that two
/// concurrent `post_double_entry` calls touching the same account
/// serialize at the database level rather than racing — pessimistic
/// locking, in contrast to the optimistic-concurrency approach used on
/// the NestJS side's own `Account` projection.
async fn lock_account_for_update(
    tx: &mut Transaction<'_, Postgres>,
    external_account_id: Uuid,
) -> Result<LedgerAccount, EngineError> {
    let query =
        format!("SELECT {ACCOUNT_COLUMNS} FROM ledger_accounts WHERE external_account_id = $1 FOR UPDATE");

    let account = sqlx::query_as::<_, LedgerAccount>(&query)
        .bind(external_account_id)
        .fetch_optional(&mut **tx)
        .await?
        .ok_or_else(|| EngineError::AccountNotFound(external_account_id.to_string()))?;

    Ok(account)
}

/// Atomically posts a balanced debit/credit pair. See this module's
/// header and /proto/ledger.proto's `PostDoubleEntry` RPC for the
/// idempotency contract.
pub async fn post_double_entry(
    pool: &PgPool,
    params: PostDoubleEntryParams,
) -> Result<PostDoubleEntryResult, EngineError> {
    if params.amount_minor_units <= 0 {
        return Err(EngineError::Validation(
            "amount_minor_units must be positive".to_string(),
        ));
    }
    if params.debit_external_account_id == params.credit_external_account_id {
        return Err(EngineError::Validation(
            "debit and credit accounts must differ".to_string(),
        ));
    }

    let mut tx = pool.begin().await?;

    // Idempotency check first: a retried call with the same key never
    // re-applies the balance change, even if the original commit
    // already happened and the caller simply never saw the response.
    if let Some(existing) =
        find_transaction_by_idempotency_key(&mut tx, &params.idempotency_key).await?
    {
        let debit_account_query = format!("SELECT {ACCOUNT_COLUMNS} FROM ledger_accounts WHERE id = $1");
        let debit_account = sqlx::query_as::<_, LedgerAccount>(&debit_account_query)
            .bind(existing.debit_ledger_account_id)
            .fetch_one(&mut *tx)
            .await?;

        let credit_account_query = format!("SELECT {ACCOUNT_COLUMNS} FROM ledger_accounts WHERE id = $1");
        let credit_account = sqlx::query_as::<_, LedgerAccount>(&credit_account_query)
            .bind(existing.credit_ledger_account_id)
            .fetch_one(&mut *tx)
            .await?;

        tx.commit().await?;

        return Ok(PostDoubleEntryResult {
            transaction_id: existing.id,
            debit_account_balance_minor_units: debit_account.balance_minor_units,
            credit_account_balance_minor_units: credit_account.balance_minor_units,
        });
    }

    // Lock both accounts in a consistent order (by external id) to
    // avoid deadlocking against a concurrent transfer in the opposite
    // direction between the same two accounts.
    let (first_id, second_id) =
        if params.debit_external_account_id < params.credit_external_account_id {
            (params.debit_external_account_id, params.credit_external_account_id)
        } else {
            (params.credit_external_account_id, params.debit_external_account_id)
        };
    let first_locked = lock_account_for_update(&mut tx, first_id).await?;
    let second_locked = lock_account_for_update(&mut tx, second_id).await?;

    let (debit_account, credit_account) =
        if first_locked.external_account_id == params.debit_external_account_id {
            (first_locked, second_locked)
        } else {
            (second_locked, first_locked)
        };

    if debit_account.currency != params.currency {
        return Err(EngineError::CurrencyMismatch {
            expected: debit_account.currency,
            actual: params.currency,
        });
    }
    if credit_account.currency != params.currency {
        return Err(EngineError::CurrencyMismatch {
            expected: credit_account.currency,
            actual: params.currency,
        });
    }
    if debit_account.balance_minor_units < params.amount_minor_units {
        return Err(EngineError::InsufficientFunds(
            params.debit_external_account_id.to_string(),
        ));
    }

    let new_debit_balance = debit_account.balance_minor_units - params.amount_minor_units;
    let new_credit_balance = credit_account.balance_minor_units + params.amount_minor_units;

    sqlx::query(
        "UPDATE ledger_accounts SET balance_minor_units = $1, version = version + 1, updated_at = $2 WHERE id = $3",
    )
    .bind(new_debit_balance)
    .bind(Utc::now())
    .bind(debit_account.id)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "UPDATE ledger_accounts SET balance_minor_units = $1, version = version + 1, updated_at = $2 WHERE id = $3",
    )
    .bind(new_credit_balance)
    .bind(Utc::now())
    .bind(credit_account.id)
    .execute(&mut *tx)
    .await?;

    let transaction_id = Uuid::new_v4();
    sqlx::query(
        r#"
        INSERT INTO ledger_transactions
            (id, idempotency_key, debit_ledger_account_id, credit_ledger_account_id, amount_minor_units, currency, narration)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(transaction_id)
    .bind(&params.idempotency_key)
    .bind(debit_account.id)
    .bind(credit_account.id)
    .bind(params.amount_minor_units)
    .bind(&params.currency)
    .bind(&params.narration)
    .execute(&mut *tx)
    .await?;

    insert_entry(
        &mut tx,
        transaction_id,
        debit_account.id,
        EntryDirection::Debit,
        params.amount_minor_units,
        &params.currency,
    )
    .await?;
    insert_entry(
        &mut tx,
        transaction_id,
        credit_account.id,
        EntryDirection::Credit,
        params.amount_minor_units,
        &params.currency,
    )
    .await?;

    tx.commit().await?;

    Ok(PostDoubleEntryResult {
        transaction_id,
        debit_account_balance_minor_units: new_debit_balance,
        credit_account_balance_minor_units: new_credit_balance,
    })
}

async fn insert_entry(
    tx: &mut Transaction<'_, Postgres>,
    transaction_id: Uuid,
    ledger_account_id: Uuid,
    direction: EntryDirection,
    amount_minor_units: i64,
    currency: &str,
) -> Result<(), EngineError> {
    sqlx::query(
        r#"
        INSERT INTO ledger_entries (id, transaction_id, ledger_account_id, direction, amount_minor_units, currency)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(transaction_id)
    .bind(ledger_account_id)
    .bind(direction)
    .bind(amount_minor_units)
    .bind(currency)
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Reverses a previously-posted transaction with an equal and opposite
/// entry pair — the original entries are never mutated or deleted,
/// preserving the ledger's immutability guarantee.
pub async fn reverse_transaction(
    pool: &PgPool,
    original_transaction_id: Uuid,
    idempotency_key: String,
    narration: String,
) -> Result<PostDoubleEntryResult, EngineError> {
    let query = format!("SELECT {TRANSACTION_COLUMNS} FROM ledger_transactions WHERE id = $1");

    let original = sqlx::query_as::<_, LedgerTransaction>(&query)
        .bind(original_transaction_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| EngineError::TransactionNotFound(original_transaction_id.to_string()))?;

    // Swapped: the original transaction's credit account is now
    // debited, and vice versa, to produce an equal-and-opposite entry.
    let debit_account = find_account_by_id(pool, original.credit_ledger_account_id).await?;
    let credit_account = find_account_by_id(pool, original.debit_ledger_account_id).await?;

    post_double_entry(
        pool,
        PostDoubleEntryParams {
            idempotency_key,
            debit_external_account_id: debit_account.external_account_id,
            credit_external_account_id: credit_account.external_account_id,
            amount_minor_units: original.amount_minor_units,
            currency: original.currency,
            narration,
        },
    )
    .await
}
