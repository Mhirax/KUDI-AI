use thiserror::Error;

/// Canonical error type for the ledger engine.
#[derive(Debug, Error)]
pub enum EngineError {
    #[error("validation error: {0}")]
    Validation(String),

    #[error("ledger account not found: {0}")]
    AccountNotFound(String),

    #[error("insufficient funds in account {0}")]
    InsufficientFunds(String),

    #[error("currency mismatch: expected {expected}, got {actual}")]
    CurrencyMismatch { expected: String, actual: String },

    #[error("transaction not found: {0}")]
    TransactionNotFound(String),

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("internal engine error: {0}")]
    Internal(String),
}

/// Translates engine errors into the corresponding gRPC status, so
/// every RPC handler in `grpc.rs` can simply propagate `EngineError`
/// via `?` and rely on this conversion rather than hand-mapping status
/// codes at every call site.
impl From<EngineError> for tonic::Status {
    fn from(err: EngineError) -> Self {
        match err {
            EngineError::Validation(msg) => tonic::Status::invalid_argument(msg),
            EngineError::AccountNotFound(msg) => tonic::Status::not_found(msg),
            EngineError::TransactionNotFound(msg) => tonic::Status::not_found(msg),
            EngineError::InsufficientFunds(account_id) => tonic::Status::failed_precondition(
                format!("insufficient funds in account {account_id}"),
            ),
            EngineError::CurrencyMismatch { expected, actual } => tonic::Status::invalid_argument(
                format!("currency mismatch: expected {expected}, got {actual}"),
            ),
            EngineError::Database(e) => {
                tonic::Status::internal(format!("database error: {e}"))
            }
            EngineError::Internal(msg) => tonic::Status::internal(msg),
        }
    }
}
