//! shared
//!
//! Shared Rust types/utilities (money type, error types, tracing setup) reused by every engine crate.
//!
//! Phase 1 — foundation only. No business logic is implemented yet;
//! this crate establishes module layout, error types, and public API
//! surface conventions shared across the Rust core banking engines.

pub mod error;
pub mod types;

pub use error::EngineError;

/// Crate-level result alias used across the public API.
pub type EngineResult<T> = Result<T, EngineError>;
