import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppConfigService } from '../config/app-config.service';

/**
 * Wraps `PrismaClient` as an injectable Nest provider.
 *
 * - Connects eagerly in `onModuleInit` so a database outage is discovered at
 *   application startup (fail fast) rather than on the first request that
 *   happens to touch the database.
 * - Disconnects in `onModuleDestroy`, which Nest calls automatically during
 *   a graceful shutdown once `app.enableShutdownHooks()` is active (see
 *   main.ts) — this lets in-flight queries drain instead of the connection
 *   pool being torn down mid-transaction on SIGTERM.
 * - Logging is environment-aware: verbose query logging in development,
 *   warnings/errors only in production. Query-level logs at production
 *   volume are both noisy and a potential vector for sensitive data (bound
 *   parameter values) leaking into a log aggregator, so they're opt-in via
 *   `NODE_ENV=development` only, using Prisma's standard stdout log mode
 *   rather than the event-emitter API (which requires literal, non-dynamic
 *   log-level arrays to type-check cleanly against the generated client).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super(
      config.isProduction
        ? {
            datasources: { db: { url: config.databaseUrl } },
            log: ['warn', 'error'],
            errorFormat: 'minimal',
          }
        : {
            datasources: { db: { url: config.databaseUrl } },
            log: ['query', 'info', 'warn', 'error'],
            errorFormat: 'pretty',
          },
    );
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      // Fail fast: an application that can't reach its database has no
      // business accepting HTTP traffic. Let Nest's bootstrap crash loudly
      // rather than starting in a broken state (see main.ts's bootstrap
      // catch block, which logs and exits with a non-zero code).
      this.logger.error(
        'Failed to connect to the database',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
