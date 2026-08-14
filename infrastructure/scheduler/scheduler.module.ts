import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

/**
 * Cron/interval job scheduling module (e.g. settlement batch runs,
 * reconciliation sweeps, dormant-account checks).
 */
@Module({
  imports: [ScheduleModule.forRoot()],
})
export class SchedulerModule {}
