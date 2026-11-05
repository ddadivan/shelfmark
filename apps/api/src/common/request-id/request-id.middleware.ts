import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';
export const REQUEST_ID_LOCAL = 'requestId';

const VALID_REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Accepts a well-formed incoming X-Request-Id, otherwise generates one.
 * The id is echoed in the response header and stored in `res.locals` so the
 * exception filter can put it into error bodies. Registered with `app.use`
 * before the body parsers so that even parse errors carry an id.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get(REQUEST_ID_HEADER);
  const requestId =
    incoming !== undefined && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.locals[REQUEST_ID_LOCAL] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
