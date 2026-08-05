# Kubernetes (Deployment)

Per-service Deployment/Service/HorizontalPodAutoscaler manifests, plus
shared namespace/ConfigMap/Secret templates under `base/`. All services
run 3+ replicas by default with rolling, zero-downtime updates,
readiness/liveness probes, and CPU-based autoscaling (3–20 replicas).

Secrets must be provisioned through a managed secrets integration
(e.g. External Secrets Operator) in real environments — the
`secrets.example.yaml` file is illustrative only.
