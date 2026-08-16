import { Logger, RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import './types/express';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Buffer logs until our own logger (attached below) takes over, so
    // nothing from the bootstrap phase is lost to the default console
    // logger and then silently dropped.
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // The app runs behind a reverse proxy / load balancer in every real
  // deployment; without this, `req.ip` and the throttler's client-IP
  // resolution both silently read the proxy's IP instead of the client's.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Health probes are infrastructure endpoints, not API surface — they stay
  // unprefixed and unversioned so orchestrator/uptime-monitor configuration
  // never has to track an API version bump.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip properties not declared on the DTO
      forbidNonWhitelisted: true, // reject requests that include them, rather than silently dropping
      transform: true, // populate DTO instances with correct primitive types
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
    }),
  );

  // Lets Nest's lifecycle hooks (PrismaService.onModuleDestroy, etc.) run to
  // completion on SIGTERM/SIGINT instead of the process being killed
  // mid-shutdown by the container orchestrator.
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(`Praxis API listening on port ${config.port} [${config.env}]`);
}

bootstrap().catch((error: unknown) => {
  // A failure during bootstrap (e.g. invalid env, unreachable database)
  // must crash the process loudly and immediately — never leave it running
  // in a half-initialized state that looks alive to an orchestrator's
  // liveness probe but can't actually serve traffic.

  console.error('Fatal error during application bootstrap:', error);
  process.exit(1);
});
