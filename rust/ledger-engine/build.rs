fn main() -> Result<(), Box<dyn std::error::Error>> {
    // The proto contract is shared with the NestJS gRPC client and
    // lives at the repo root (/proto), not inside this crate, since it
    // is not Rust-specific — see /proto/ledger.proto's header comment.
    let proto_root = "../../proto";
    let proto_file = "../../proto/ledger.proto";

    println!("cargo:rerun-if-changed={}", proto_file);

    tonic_build::configure().build_server(true).build_client(false).compile(
        &[proto_file],
        &[proto_root],
    )?;

    Ok(())
}
