import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [{ ttl: config.throttleTtlMs, limit: config.throttleLimit }],
      }),
    }),
    HealthModule,
    AuthModule,
    CoursesModule,
  ],
  providers: [
    // Global rate limiting — a sane default ceiling on every route. Specific
    // endpoints that need a stricter limit (login, password reset) will
    // override this with their own `@Throttle()` decorator once the auth
    // module exists; this is the floor, not the whole strategy.
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // Every response passes through the logging + timeout interceptors,
    // and every uncaught error passes through the exception filter — order
    // matters here: interceptors run outside-in on the way in, so logging
    // wraps timeout, which wraps the actual handler.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
