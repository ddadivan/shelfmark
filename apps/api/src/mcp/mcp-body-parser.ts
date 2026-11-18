import { MCP_ENDPOINT } from '@shelfmark/contracts';
import { text, type RequestHandler } from 'express';

const BODY_LIMIT = '100kb';
const JSON_MIME = 'application/json';
const ROUTE = new RegExp(`^${MCP_ENDPOINT.Server}/?$`);
const CACHE_CONTROL_HEADER = 'Cache-Control';
const NO_STORE = 'no-store';
const parser = text({ type: JSON_MIME, limit: BODY_LIMIT });

/**
 * Prepares requests to `/api/mcp`. Every answer of the route, errors included (400, 401, 403, 405,
 * 413, 429 from the throttler or the daily cap), is `Cache-Control: no-store`. A `POST` reads its
 * JSON body as text (same 100kb limit as the global parser), so the handler can answer unparseable
 * JSON with JSON-RPC `-32700` after the token guard, instead of the parser's 400 before it. Every
 * other request passes through to the global JSON parser, which skips a body that was already read.
 * A non-JSON content type is left unread (the CSRF guard answers 415).
 */
export const mcpBodyParser: RequestHandler = (req, res, next) => {
  if (!ROUTE.test(req.path)) {
    next();
    return;
  }
  res.setHeader(CACHE_CONTROL_HEADER, NO_STORE);
  if (req.method !== 'POST') {
    next();
    return;
  }
  parser(req, res, next);
};
