//! Core types shared within this crate. Domain-specific types are added
//! per engine starting Phase 2.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Placeholder identifier type used across engine boundaries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct EngineId(pub Uuid);

impl EngineId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }
}

impl Default for EngineId {
    fn default() -> Self {
        Self::new()
    }
}
