import { MCP_ENDPOINT } from '@shelfmark/contracts';
import { text, type RequestHandler } from 'express';

const BODY_LIMIT = '100kb';
const JSON_MIME = 'application/json';
const ROUTE = new RegExp(`^${MCP_ENDPOINT.Server}/?$`);
const parser = text({ type: JSON_MIME, limit: BODY_LIMIT });

/**
 * Reads the JSON body of `POST /api/mcp` as text (same 100kb limit as the global parser), so the
 * handler can answer unparseable JSON with JSON-RPC `-32700` after the token guard, instead of the
 * parser's 400 before it. Every other request passes through to the global JSON parser, which skips
 * a body that was already read. A non-JSON content type is left unread (the CSRF guard answers 415).
 */
export const mcpBodyParser: RequestHandler = (req, res, next) => {
  if (req.method !== 'POST' || !ROUTE.test(req.path)) {
    next();
    return;
  }
  parser(req, res, next);
};
