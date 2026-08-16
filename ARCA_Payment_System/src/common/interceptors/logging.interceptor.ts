import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Structured access logging: one line per request on success, one line per
 * request on failure (the failure case logs here rather than relying solely
 * on the exception filter, since by the time the filter runs it no longer
 * has an easy handle on the original request start time / latency).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const { method, originalUrl, requestId } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log(
          `${method} ${originalUrl} ${response.statusCode} ${durationMs}ms — reqId=${requestId}`,
        );
      }),
      catchError((error: unknown) => {
        const durationMs = Date.now() - start;
        const statusCode = response.statusCode >= 400 ? response.statusCode : 500;
        this.logger.warn(
          `${method} ${originalUrl} ${statusCode} ${durationMs}ms — reqId=${requestId} — ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
        throw error;
      }),
    );
  }
}
