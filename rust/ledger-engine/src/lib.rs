//! ledger_engine
//!
//! Double-entry ledger engine responsible for posting, balancing, and
//! immutable transaction records for Kudi AI Bank.
//!
//! This is the authoritative source of truth for account balances,
//! exposed to the NestJS application layer exclusively via the gRPC
//! contract in /proto/ledger.proto (see src/grpc.rs for the service
//! implementation, src/repository.rs for the real posting logic, and
//! src/bin/server.rs for the runnable server binary).

pub mod error;
pub mod grpc;
pub mod repository;
pub mod types;

pub mod proto {
    tonic::include_proto!("kudi.ledger.v1");
}

pub use error::EngineError;

/// Crate-level result alias used across the public API.
pub type EngineResult<T> = Result<T, EngineError>;
