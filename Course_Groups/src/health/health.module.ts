import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';

@Module({
  imports: [
    TerminusModule.forRoot({
      // Bound how long a single health check run may take overall, so a
      // hung dependency can't block the probe endpoint indefinitely and
      // cause the orchestrator's own probe timeout to fire on top of it.
      gracefulShutdownTimeoutMs: 5000,
    }),
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
