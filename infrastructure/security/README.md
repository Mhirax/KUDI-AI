# Security

JWT configuration, field-level encryption utilities (AES-256-GCM),
secrets management integration points, and security headers policy.
Production keys must be sourced from a managed secrets vault (e.g. AWS
Secrets Manager / HashiCorp Vault) — never committed to source control.
