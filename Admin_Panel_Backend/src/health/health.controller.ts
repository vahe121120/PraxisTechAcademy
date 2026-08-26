import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaHealthIndicator } from './indicators/prisma.health-indicator';

/**
 * Deliberately split into liveness and readiness, matching Kubernetes' (or
 * any orchestrator's) two-probe model:
 *
 * - Liveness ("is the process alive"): must NOT depend on the database. If
 *   the DB is briefly unreachable, the orchestrator should not kill and
 *   restart a perfectly healthy application instance — that would turn a
 *   transient DB blip into a full pod restart storm.
 * - Readiness ("can this instance serve traffic right now"): DOES depend on
 *   the database. If the DB is unreachable, this instance should be pulled
 *   out of the load balancer's rotation until it recovers.
 *
 * `GET /health` is kept as a plain alias of readiness for simple uptime
 * monitors (e.g. a status page pinger) that only know how to hit one URL.
 */
@Public()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  checkLiveness(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      // Guards against an instance limping along on a nearly-full heap —
      // 300MB RSS is a conservative default for a small Node API; tune
      // against real memory limits once the container's resource requests
      // are finalized.
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.99 }),
    ]);
  }

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.checkReadiness();
  }
}
