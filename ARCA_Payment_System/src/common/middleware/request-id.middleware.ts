import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { REQUEST_ID_HEADER } from '../constants/app.constants';

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
  }
}

/**
 * Accepts an inbound `x-request-id` (e.g. set by an upstream load balancer
 * or API gateway) so traces stay correlated end-to-end, or generates a new
 * one otherwise. The ID is echoed back on the response and attached to
 * `req.requestId` so the logging interceptor and exception filter can both
 * tag every log line / error payload with it — this is what makes a single
 * failed request findable across logs without grepping timestamps.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    next();
  }
}
