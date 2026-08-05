//! Runnable gRPC server binary for the ledger engine.
//!
//! Reads `DATABASE_URL` and `LEDGER_ENGINE_PORT` from the environment,
//! establishes a Postgres connection pool, runs pending migrations
//! (owned exclusively by this service — see /migrations), and serves
//! `LedgerService` over gRPC.

use std::net::SocketAddr;
use std::time::Duration;

use ledger_engine::grpc::LedgerServiceImpl;
use ledger_engine::proto::ledger_service_server::LedgerServiceServer;
use sqlx::postgres::PgPoolOptions;
use tonic::transport::Server;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set (this service owns its own Postgres tables — see migrations/)");

    let port: u16 = std::env::var("LEDGER_ENGINE_PORT")
        .unwrap_or_else(|_| "50051".to_string())
        .parse()
        .expect("LEDGER_ENGINE_PORT must be a valid port number");

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await?;

    tracing::info!("Running ledger-engine migrations");
    sqlx::migrate!("./migrations").run(&pool).await?;

    let addr: SocketAddr = format!("0.0.0.0:{port}").parse()?;
    tracing::info!("ledger-engine gRPC server listening on {addr}");

    Server::builder()
        .add_service(LedgerServiceServer::new(LedgerServiceImpl::new(pool)))
        .serve(addr)
        .await?;

    Ok(())
}
