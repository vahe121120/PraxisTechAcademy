import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * A hung downstream dependency (a slow query, a stalled gateway call) must
 * not be allowed to hold a request — and the connection pool slot behind it
 * — open indefinitely. This bounds every request to a hard ceiling and
 * converts a timeout into a proper 408, instead of the connection eventually
 * dying with an opaque socket error on the client side.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request took too long to process'));
        }
        return throwError(() => error as Error);
      }),
    );
  }
}
