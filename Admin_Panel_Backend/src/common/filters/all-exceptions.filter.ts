import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { AppConfigService } from '../../config/app-config.service';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId: string;
}

/**
 * Every uncaught error in the application funnels through here, guaranteeing
 * a single, consistent JSON error shape regardless of whether it originated
 * as a validation failure, a Prisma constraint violation, a deliberate
 * `HttpException`, or a genuinely unexpected bug.
 *
 * Two things this filter is deliberately strict about:
 *  1. Prisma errors are translated to the *correct* HTTP status (a unique
 *     constraint violation is a 409, not a 500) instead of leaking a raw
 *     database error to the client.
 *  2. In production, unexpected (non-HttpException) errors return a generic
 *     message — the real error is logged server-side with full detail, but
 *     stack traces and internal error text never reach the response body.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.resolve(exception);

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.originalUrl} — reqId=${request.requestId}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${statusCode} ${error} on ${request.method} ${request.originalUrl} — reqId=${request.requestId}`,
      );
    }

    response.status(statusCode).json(body);
  }

  private resolve(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: status, error: HttpStatus[status] ?? 'Error', message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      // A malformed query reached Prisma — this is always a server-side
      // bug (bad input should have been rejected by the ValidationPipe
      // long before it got here), so it's a 500, but with a message that
      // doesn't echo the raw Prisma validation text back to the client.
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An internal error occurred while processing the request.',
      };
    }

    // Anything else is unexpected. Never leak the raw error message in
    // production — only the message we control.
    const message = this.config.isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : exception instanceof Error
        ? exception.message
        : 'An unexpected error occurred.';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message,
    };
  }

  private resolvePrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    error: string;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = Array.isArray(exception.meta?.target)
          ? (exception.meta.target as string[]).join(', ')
          : 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: `A record with this ${target} already exists.`,
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested resource was not found.',
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'This operation violates a required relationship to another record.',
        };
      case 'P2000':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'One of the provided values is too long for its column.',
        };
      default:
        this.logger.error(`Unhandled Prisma error code: ${exception.code}`, exception.message);
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'An internal error occurred while accessing the database.',
        };
    }
  }
}
