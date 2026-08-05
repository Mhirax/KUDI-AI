//! Implements the `LedgerService` gRPC trait generated from
//! /proto/ledger.proto. Every method here does the same three things:
//! parse/validate the incoming protobuf message, call into
//! `repository.rs` for the actual logic, and map the result (or
//! `EngineError`, via its `From<EngineError> for tonic::Status` impl)
//! back into the protobuf response type.

use sqlx::PgPool;
use tonic::{Request, Response, Status};
use uuid::Uuid;

use crate::proto::ledger_service_server::LedgerService;
use crate::proto::{
    GetBalanceRequest, GetBalanceResponse, PostDoubleEntryRequest, PostDoubleEntryResponse,
    RegisterAccountRequest, RegisterAccountResponse, ReverseTransactionRequest,
    ReverseTransactionResponse,
};
use crate::repository;
use crate::types::PostDoubleEntryParams;

pub struct LedgerServiceImpl {
    pool: PgPool,
}

impl LedgerServiceImpl {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

fn parse_uuid(field_name: &str, value: &str) -> Result<Uuid, Status> {
    Uuid::parse_str(value)
        .map_err(|_| Status::invalid_argument(format!("{field_name} is not a valid UUID: {value}")))
}

#[tonic::async_trait]
impl LedgerService for LedgerServiceImpl {
    async fn register_account(
        &self,
        request: Request<RegisterAccountRequest>,
    ) -> Result<Response<RegisterAccountResponse>, Status> {
        let req = request.into_inner();
        let external_account_id = parse_uuid("external_account_id", &req.external_account_id)?;

        let account = repository::register_account(&self.pool, external_account_id, &req.currency)
            .await?;

        Ok(Response::new(RegisterAccountResponse {
            ledger_account_id: account.id.to_string(),
        }))
    }

    async fn post_double_entry(
        &self,
        request: Request<PostDoubleEntryRequest>,
    ) -> Result<Response<PostDoubleEntryResponse>, Status> {
        let req = request.into_inner();
        let debit_external_account_id =
            parse_uuid("debit_external_account_id", &req.debit_external_account_id)?;
        let credit_external_account_id =
            parse_uuid("credit_external_account_id", &req.credit_external_account_id)?;

        if req.idempotency_key.trim().is_empty() {
            return Err(Status::invalid_argument("idempotency_key must not be empty"));
        }

        let result = repository::post_double_entry(
            &self.pool,
            PostDoubleEntryParams {
                idempotency_key: req.idempotency_key,
                debit_external_account_id,
                credit_external_account_id,
                amount_minor_units: req.amount_minor_units,
                currency: req.currency,
                narration: req.narration,
            },
        )
        .await?;

        Ok(Response::new(PostDoubleEntryResponse {
            transaction_id: result.transaction_id.to_string(),
            debit_account_balance_minor_units: result.debit_account_balance_minor_units,
            credit_account_balance_minor_units: result.credit_account_balance_minor_units,
        }))
    }

    async fn reverse_transaction(
        &self,
        request: Request<ReverseTransactionRequest>,
    ) -> Result<Response<ReverseTransactionResponse>, Status> {
        let req = request.into_inner();
        let original_transaction_id =
            parse_uuid("original_transaction_id", &req.original_transaction_id)?;

        let result = repository::reverse_transaction(
            &self.pool,
            original_transaction_id,
            req.idempotency_key,
            req.narration,
        )
        .await?;

        Ok(Response::new(ReverseTransactionResponse {
            reversal_transaction_id: result.transaction_id.to_string(),
        }))
    }

    async fn get_balance(
        &self,
        request: Request<GetBalanceRequest>,
    ) -> Result<Response<GetBalanceResponse>, Status> {
        let req = request.into_inner();
        let external_account_id = parse_uuid("external_account_id", &req.external_account_id)?;

        let (balance_minor_units, currency) =
            repository::get_balance(&self.pool, external_account_id).await?;

        Ok(Response::new(GetBalanceResponse {
            balance_minor_units,
            currency,
        }))
    }
}
