# Integrations

Third-party service adapters, isolated from domain logic per Clean
Architecture's dependency-inversion principle. Every integration exposes
a port (interface) consumed by application services, with the concrete
provider client as the adapter implementation.
