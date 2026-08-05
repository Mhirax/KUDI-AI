use thiserror::Error;

/// Canonical error type for shared.
#[derive(Debug, Error)]
pub enum EngineError {
    #[error("validation error: {0}")]
    Validation(String),

    #[error("not found: {0}")]
    NotFound(String),

    #[error("internal engine error: {0}")]
    Internal(String),
}
