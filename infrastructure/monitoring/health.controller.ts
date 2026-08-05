import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

/**
 * Placeholder health-check aggregator (DB, Redis, RabbitMQ, ledger
 * engine). Wired into each app's module tree in Phase 2.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
